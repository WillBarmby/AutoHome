from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from ..models.schema import (
    ApprovalQueueItem,
    ChatIntent,
    ChatMessage,
    Command,
    DashboardState,
    Entity,
    ScheduledCommand,
    UserProfile,
)
from ..services.state_store import state_store
from ..services.ha_thermostat_service import ha_thermostat_service
from ..services.schedule_service import (
    append_queue_command,
    queue_from_intent,
    rebuild_daily_schedule,
)
from ..config import MOCK_HA

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


STATE_FILE = Path(__file__).resolve().parents[2] / "state" / "devices.json"


@router.get("/devices", response_model=list[Entity])
async def get_devices() -> list[Entity]:
    with STATE_FILE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return [Entity(**entity) for entity in payload]


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, object]:
    try:
        with STATE_FILE.open("r", encoding="utf-8") as handle:
            devices = json.load(handle)
    except FileNotFoundError:
        return {
            "status": "error",
            "message": f"Devices state file not found at {STATE_FILE}",
        }

    updated_entity: dict[str, object] | None = None
    for entity in devices:
        if entity.get("entity_id") != cmd.entity_id:
            continue

        service = cmd.service.lower()
        current_state = entity.get("state")

        if service.endswith("toggle") and isinstance(current_state, str):
            entity["state"] = "off" if current_state == "on" else "on"
        elif service.endswith("turn_on"):
            entity["state"] = "on"
        elif service.endswith("turn_off"):
            entity["state"] = "off"

        if cmd.data:
            state_override = cmd.data.get("state")
            if state_override is not None:
                entity["state"] = state_override

            attributes = entity.setdefault("attributes", {})
            for key, value in cmd.data.items():
                if key == "state":
                    continue
                if isinstance(attributes, dict):
                    attributes[key] = value

        updated_entity = entity
        break

    if updated_entity is None:
        return {
            "status": "error",
            "message": f"No entity found with id {cmd.entity_id}",
        }

    with STATE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(devices, handle, indent=2)

    return {
        "status": "ok",
        "entity": Entity(**updated_entity).dict(),
    }


@router.get("/dashboard", response_model=DashboardState)
async def get_dashboard_state() -> DashboardState:
    payload = state_store.load_dashboard()
    return DashboardState(**payload)


class OperationModePayload(BaseModel):
    mode: Literal["manual", "auto", "paused"]


@router.patch("/dashboard/operation-mode", response_model=DashboardState)
async def set_operation_mode(payload: OperationModePayload) -> DashboardState:
    dashboard = state_store.load_dashboard()
    dashboard["operation_mode"] = payload.mode
    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


class ApprovalUpdatePayload(BaseModel):
    status: Literal["pending", "approved", "rejected"]


@router.patch("/dashboard/approvals/{item_id}", response_model=DashboardState)
async def update_approval_queue(item_id: str, payload: ApprovalUpdatePayload) -> DashboardState:
    dashboard = state_store.load_dashboard()
    queue: list[Dict[str, Any]] = dashboard.get("approval_queue", [])
    for item in queue:
        if item.get("id") == item_id:
            item["status"] = payload.status
            break
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval item not found")

    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


class ApprovalCreatePayload(BaseModel):
    summary: str
    intent: ChatIntent
    guardrailBadges: List[str] = Field(default_factory=list)
    costDelta: Optional[str] = None
    comfortDelta: Optional[str] = None
    expiresInSeconds: int = Field(default=300, ge=10, le=3600)


@router.post("/dashboard/approvals", response_model=DashboardState)
async def create_approval_item(payload: ApprovalCreatePayload) -> DashboardState:
    dashboard = state_store.load_dashboard()
    now = datetime.now(timezone.utc)
    item = ApprovalQueueItem(
        id=str(int(now.timestamp() * 1000)),
        summary=payload.summary,
        intent=payload.intent,
        guardrailBadges=payload.guardrailBadges,
        costDelta=payload.costDelta,
        comfortDelta=payload.comfortDelta,
        expiresAt=now + timedelta(seconds=payload.expiresInSeconds),
        status="pending",
    )
    queue = dashboard.setdefault("approval_queue", [])
    queue.append(jsonable_encoder(item))
    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


def _extract_device(text: str) -> str:
    lower = text.lower()
    if "living room" in lower:
        return "light.living_room"
    if "bedroom" in lower:
        return "light.bedroom"
    if "coffee" in lower:
        return "switch.coffee_machine"
    if "fan" in lower:
        return "fan.office_fan"
    if "garage" in lower:
        return "cover.garage"
    if "thermostat" in lower:
        return "climate.thermostat_hall"
    return "unknown"


def _extract_percentage(text: str) -> int:
    import re

    match = re.search(r"(\d+)%", text)
    if match:
        return int(match.group(1))
    return 50


def _extract_temperature(text: str) -> int:
    import re

    match = re.search(r"(\d+)(?:°| degrees)", text)
    if match:
        return int(match.group(1))
    return 72


def _parse_intent(text: str) -> ChatIntent:
    lower_text = text.lower()

    if "turn on" in lower_text or "turn off" in lower_text:
        state = "turn on" in lower_text
        device = _extract_device(lower_text)
        return ChatIntent(type="ToggleDevice", device=device, state=state)

    if "set" in lower_text and "%" in lower_text:
        level = _extract_percentage(lower_text)
        device = _extract_device(lower_text)
        return ChatIntent(type="SetLevel", device=device, level=level)

    if "temperature" in lower_text or "degrees" in lower_text:
        temp = _extract_temperature(lower_text)
        return ChatIntent(type="SetLevel", device="climate.thermostat_hall", temperature=temp)

    return ChatIntent(type="QueryStatus", parameters={"query": text})


def _generate_llm_response(text: str, intent: ChatIntent) -> str:
    """Generate a conversational response using LLM with fallback to rule-based responses."""
    try:
        # Try to use Ollama for generating conversational responses
        import subprocess
        import json
        
        # Create a prompt for the LLM
        prompt = f"""You are a helpful home automation assistant. A user said: "{text}"

The system interpreted this as: {intent.type}
- Device: {intent.device}
- State: {intent.state}
- Level: {intent.level}
- Temperature: {intent.temperature}

Generate a friendly, conversational response (1-2 sentences) that acknowledges what the user wants and confirms the action. Be helpful and natural.

Response:"""
        
        result = subprocess.run(
            ["ollama", "run", "llama3.2", prompt],
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout.strip():
            response = result.stdout.strip()
            # Clean up the response (remove any extra formatting)
            if response.startswith("Response:"):
                response = response[9:].strip()
            if len(response) > 200:  # Limit response length
                response = response[:200] + "..."
            return response
            
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
        logger.warning(f"LLM response generation failed: {e}, falling back to rule-based response")
    
    # Fallback to rule-based responses
    return _generate_rule_based_response(intent)


def _generate_rule_based_response(intent: ChatIntent) -> str:
    """Generate rule-based responses as fallback."""
    if intent.type == "ToggleDevice":
        name = (intent.device or "device").split(".")[-1].replace("_", " ")
        return f"I've {'turned on' if intent.state else 'turned off'} the {name}."
    if intent.type == "SetLevel":
        if intent.temperature is not None:
            return f"I've set the thermostat to {intent.temperature}°F."
        name = (intent.device or "device").split(".")[-1].replace("_", " ")
        return f"I've set the {name} to {intent.level}%."
    if intent.type == "QueryStatus":
        query = intent.parameters.get("query", "").lower() if intent.parameters else ""
        
        # Handle common questions
        if any(word in query for word in ["temperature", "temp", "degrees"]):
            return "I can help you with temperature control. You can ask me to set the thermostat to a specific temperature, or I can tell you the current temperature in your home."
        
        if any(word in query for word in ["light", "lights", "brightness"]):
            return "I can control your lights! You can ask me to turn lights on or off, or adjust their brightness. Which room would you like to control?"
        
        if any(word in query for word in ["help", "what", "how", "can you"]):
            return "I'm your smart home assistant! I can help you control lights, adjust the thermostat, and manage your devices. Just tell me what you'd like to do - for example, 'turn on the living room lights' or 'set temperature to 72 degrees'."
        
        if any(word in query for word in ["status", "state", "current"]):
            return "I can check the status of your devices. Would you like to know about your lights, thermostat, or other smart home devices?"
        
        # Default helpful response
        return "I'm here to help with your smart home! I can control lights, adjust the thermostat, and answer questions about your devices. What would you like me to do?"
    
    return "I've processed your request successfully."


class ChatRequest(BaseModel):
    text: str


class ChatResult(BaseModel):
    intent: ChatIntent
    response: str
    user: ChatMessage
    assistant: ChatMessage


@router.delete("/chat")
async def clear_chat_history():
    """Clear all chat history from the backend."""
    dashboard = state_store.load_dashboard()
    dashboard["chat_history"] = []
    state_store.save_dashboard(dashboard)
    return {"status": "success", "message": "Chat history cleared"}


@router.post("/chat", response_model=ChatResult)
async def create_chat(payload: ChatRequest) -> ChatResult:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text required")

    intent = _parse_intent(text)
    response = _generate_llm_response(text, intent)

    now = datetime.now(timezone.utc)
    user_message = ChatMessage(
        id=str(int(now.timestamp() * 1000)),
        type="user",
        content=text,
        timestamp=now,
        intent=intent,
    )
    assistant_message = ChatMessage(
        id=str(int(now.timestamp() * 1000) + 1),
        type="assistant",
        content=response,
        timestamp=now,
    )

    dashboard = state_store.load_dashboard()
    history = dashboard.setdefault("chat_history", [])
    history.append(user_message.dict())
    history.append(assistant_message.dict())
    state_store.save_dashboard(dashboard)

    # Persist the intent as a queued command when we can translate it into a
    # concrete Home Assistant call. This allows the automation runner to
    # dispatch the action even after the chat UI is closed.
    queue_candidate = queue_from_intent(text, intent.dict())
    if queue_candidate:
        append_queue_command(queue_candidate)

    return ChatResult(
        intent=intent,
        response=response,
        user=user_message,
        assistant=assistant_message,
    )


DEFAULT_PROFILE: Dict[str, Any] = {
    "leaveTime": "8:00 AM",
    "returnTime": "6:00 PM",
    "bedTime": "10:30 PM",
    "wakeTime": "6:30 AM",
    "tempAwakeF": 72,
    "tempSleepF": 70,
    "location": "San Francisco",
    "squareFootage": 2200,
    "coolingUnits": 1,
    "notes": "",
}


@router.get("/user-profile", response_model=UserProfile)
async def get_user_profile() -> UserProfile:
    data = state_store.load_preferences()
    payload = {**DEFAULT_PROFILE, **data}
    if "updatedAt" in payload and isinstance(payload["updatedAt"], str):
        payload["updatedAt"] = datetime.fromisoformat(payload["updatedAt"])
    return UserProfile(**payload)


@router.put("/user-profile", response_model=UserProfile)
async def update_user_profile(profile: UserProfile) -> UserProfile:
    data = profile.dict()
    data["updatedAt"] = (profile.updatedAt or datetime.now(timezone.utc)).isoformat()
    state_store.save_preferences(data)
    # Immediately rebuild the default daily automation schedule so the system
    # can translate preferences into repeatable Home Assistant commands.
    rebuild_daily_schedule(profile)
    return UserProfile(**data)


# =============== HOME ASSISTANT INTEGRATION ROUTES ===============

class TemperatureCalculationRequest(BaseModel):
    current_temp: float
    target_temp: float
    location: str
    square_footage: float = 2200
    num_cooling_units: int = 1
    arrival_time: Optional[str] = None
    send_to_ha: bool = True


@router.post("/ha/calculate-temperature")
async def calculate_temperature(request: TemperatureCalculationRequest) -> dict[str, Any]:
    """Calculate time to reach target temperature and optionally send to Home Assistant"""
    try:
        result = ha_thermostat_service.enhanced_calculate_time_to_temperature(
            current_temp=request.current_temp,
            target_temp=request.target_temp,
            location=request.location,
            square_footage=request.square_footage,
            num_cooling_units=request.num_cooling_units,
            send_to_ha=request.send_to_ha,
            arrival_time=request.arrival_time
        )
        return {
            "status": "success",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Temperature calculation failed: {str(e)}")


@router.get("/ha/connection")
async def check_ha_connection() -> dict[str, Any]:
    """Check Home Assistant connection status"""
    is_connected = ha_thermostat_service.check_ha_connection()
    return {
        "connected": is_connected,
        "ha_url": ha_thermostat_service.ha_url,
        "mock_mode": MOCK_HA
    }


@router.get("/ha/entities")
async def get_ha_entities() -> list[dict[str, Any]]:
    """Get all Home Assistant entities"""
    entities = ha_thermostat_service.get_all_entities()
    if entities is None:
        raise HTTPException(status_code=500, detail="Failed to get entities from Home Assistant")
    return entities


@router.get("/ha/climate-entities")
async def get_climate_entities() -> list[dict[str, Any]]:
    """Get all climate (thermostat) entities from Home Assistant"""
    entities = ha_thermostat_service.find_climate_entities()
    return entities


@router.get("/ha/entity/{entity_id}")
async def get_entity_state(entity_id: str) -> dict[str, Any]:
    """Get state of a specific Home Assistant entity"""
    state = ha_thermostat_service.get_entity_state(entity_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    return state


class ClimateControlRequest(BaseModel):
    entity_id: str
    temperature: Optional[float] = None
    hvac_mode: Optional[str] = None


@router.post("/ha/climate/set-temperature")
async def set_climate_temperature(request: ClimateControlRequest) -> dict[str, Any]:
    """Set thermostat temperature and/or HVAC mode"""
    if request.temperature is None and request.hvac_mode is None:
        raise HTTPException(status_code=400, detail="Either temperature or hvac_mode must be provided")
    
    success = ha_thermostat_service.set_climate_temperature(
        entity_id=request.entity_id,
        temperature=request.temperature or 72.0,
        hvac_mode=request.hvac_mode
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to set climate temperature")
    
    return {
        "status": "success",
        "message": f"Climate control updated for {request.entity_id}"
    }


class WeatherRequest(BaseModel):
    city: str


@router.get("/ha/weather/{city}")
async def get_weather(city: str) -> dict[str, Any]:
    """Get current weather for a city"""
    temperature = ha_thermostat_service.get_outdoor_temperature(city)
    if temperature is None:
        raise HTTPException(status_code=404, detail=f"Weather data not found for {city}")
    
    return {
        "city": city,
        "temperature": temperature,
        "unit": "°F"
    }


__all__ = ["router"]

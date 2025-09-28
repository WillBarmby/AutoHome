"""Conversational chat endpoints and helper utilities."""

from __future__ import annotations

import logging
import re
import subprocess
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from ..models.schema import ChatIntent, ChatMessage
from ..services.schedule_service import append_queue_command, queue_from_intent
from ..services.state_store import state_store


logger = logging.getLogger(__name__)

router = APIRouter()


def _extract_device(text: str) -> str:
    """Crude keyword matcher mapping natural language to an entity id."""

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
    """Parse a percentage value from free-form text and default to 50."""

    match = re.search(r"(\d+)%", text)
    if match:
        return int(match.group(1))
    return 50


def _extract_temperature(text: str) -> int:
    """Parse a temperature (°F) from free-form text and default to 72."""

    match = re.search(r"(\d+)(?:°| degrees)", text)
    if match:
        return int(match.group(1))
    return 72


def _parse_intent(text: str) -> ChatIntent:
    """Convert a user message into a structured intent record."""

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


def _generate_rule_based_response(intent: ChatIntent) -> str:
    """Return a deterministic response when the LLM is unavailable."""

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

        if any(word in query for word in ["temperature", "temp", "degrees"]):
            return "I help manage your home's temperature. Ask me to set the thermostat or check the current reading."

        if any(word in query for word in ["light", "lights", "brightness"]):
            return "I can control your lights—tell me which room and what you'd like me to do."

        if any(word in query for word in ["help", "what", "how", "can you"]):
            return "I'm your smart home assistant. Try 'turn on the living room lights' or 'set temperature to 72 degrees.'"

        if any(word in query for word in ["status", "state", "current"]):
            return "Happy to check device status. Ask about your lights, thermostat, or anything else I'm tracking."

        return "I'm here to help with your smart home—just let me know what you'd like to adjust."

    return "I've processed your request successfully."


def _generate_llm_response(text: str, intent: ChatIntent) -> str:
    """Use an LLM (if available) to craft a conversational reply."""

    try:
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
            timeout=10,
        )

        if result.returncode == 0 and result.stdout.strip():
            response = result.stdout.strip()
            if response.startswith("Response:"):
                response = response[9:].strip()
            if len(response) > 200:
                response = response[:200] + "..."
            return response

    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as error:  # pragma: no cover - defensive
        logger.warning("LLM response generation failed: %s", error)

    return _generate_rule_based_response(intent)


class ChatRequest(BaseModel):
    """User-supplied chat payload."""

    text: str


class ChatResult(BaseModel):
    """Shape of the chat response returned to the frontend."""

    intent: ChatIntent
    response: str
    user: ChatMessage
    assistant: ChatMessage


@router.delete("/chat")
async def clear_chat_history() -> dict[str, str]:
    """Remove all stored chat history entries."""

    dashboard = state_store.load_dashboard()
    dashboard["chat_history"] = []
    state_store.save_dashboard(dashboard)
    return {"status": "success", "message": "Chat history cleared"}


@router.post("/chat", response_model=ChatResult)
async def create_chat(payload: ChatRequest) -> ChatResult:
    """Append a chat exchange and enqueue any resulting automation commands."""

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
    history.append(jsonable_encoder(user_message))
    history.append(jsonable_encoder(assistant_message))
    state_store.save_dashboard(dashboard)

    queue_candidate = queue_from_intent(text, intent.dict())
    if queue_candidate:
        append_queue_command(queue_candidate)

    return ChatResult(
        intent=intent,
        response=response,
        user=user_message,
        assistant=assistant_message,
    )


__all__ = ["router"]

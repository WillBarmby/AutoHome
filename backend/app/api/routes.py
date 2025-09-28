from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from ..models.schema import (
    ApprovalQueueItem,
    ChatIntent,
    ChatMessage,
    Command,
    DashboardState,
    Entity,
    UserProfile,
)
from ..services.state_store import state_store

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
    costDelta: str | None = None
    comfortDelta: str | None = None
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


def _generate_response(intent: ChatIntent) -> str:
    if intent.type == "ToggleDevice":
        name = (intent.device or "device").split(".")[-1].replace("_", " ")
        return f"I've {'turned on' if intent.state else 'turned off'} the {name}."
    if intent.type == "SetLevel":
        if intent.temperature is not None:
            return f"I've set the thermostat to {intent.temperature}°F."
        name = (intent.device or "device").split(".")[-1].replace("_", " ")
        return f"I've set the {name} to {intent.level}%."
    return "Command processed successfully."


class ChatRequest(BaseModel):
    text: str


class ChatResult(BaseModel):
    intent: ChatIntent
    response: str
    user: ChatMessage
    assistant: ChatMessage


@router.post("/chat", response_model=ChatResult)
async def create_chat(payload: ChatRequest) -> ChatResult:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text required")

    intent = _parse_intent(text)
    response = _generate_response(intent)

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
    return UserProfile(**data)


__all__ = ["router"]

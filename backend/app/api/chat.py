"""Conversational chat endpoints and helper utilities."""

from __future__ import annotations

import logging
import re
import subprocess
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from ..models.schema import ChatIntent, ChatMessage
from ..services.ha_device_service import ha_device_service
from ..services.schedule_service import append_queue_command, queue_from_intent
from ..services.state_store import state_store


logger = logging.getLogger(__name__)

router = APIRouter()

_ALIAS_CACHE_TTL = 30.0
_alias_cache: Dict[str, object] = {"expires": 0.0, "aliases": {}}
_DOMAIN_PREFERENCE = [
    "light",
    "switch",
    "fan",
    "climate",
    "cover",
    "media_player",
    "scene",
    "script",
]
_ALIAS_REPLACEMENTS = {
    "bedroom": ["bedroom", "bed"],
    "living room": ["living room", "living"],
    "lamp": ["lamp", "light"],
    "lights": ["lights", "light"],
    "desk": ["desk", "office"],
    "coffee": ["coffee", "coffee machine"],
}

_TIME_PHRASE_REGEX = re.compile(
    r"\b(?:at|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
    flags=re.IGNORECASE,
)


def _normalise_text(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", cleaned)


def _expand_alias(base: str) -> Set[str]:
    expanded: Set[str] = {base}
    for key, replacements in _ALIAS_REPLACEMENTS.items():
        if key in base:
            for replacement in replacements:
                expanded.add(base.replace(key, replacement))
    return {_normalise_text(alias) for alias in expanded}


def _build_alias_cache() -> Dict[str, Set[str]]:
    aliases: Dict[str, Set[str]] = {}
    devices = ha_device_service.get_devices(force_refresh=False)
    for entity in devices:
        entity_id = entity.entity_id
        object_id = entity.entity_id.split(".", 1)[-1]
        friendly = entity.attributes.get("friendly_name", "")

        alias_set: Set[str] = set()
        alias_set.update(_expand_alias(_normalise_text(object_id)))
        if friendly:
            alias_set.update(_expand_alias(_normalise_text(friendly)))

        # Add simple domain-based fallbacks (e.g., "thermostat")
        domain = entity_id.split(".")[0]
        alias_set.add(_normalise_text(domain))

        aliases[entity_id] = {alias for alias in alias_set if alias}

    return aliases


def _get_aliases() -> Dict[str, Set[str]]:
    now = time.time()
    if now >= _alias_cache["expires"]:
        _alias_cache["aliases"] = _build_alias_cache()
        _alias_cache["expires"] = now + _ALIAS_CACHE_TTL
    return _alias_cache["aliases"]  # type: ignore[return-value]


def _extract_scheduled_time(raw_text: str) -> Optional[datetime]:
    match = _TIME_PHRASE_REGEX.search(raw_text)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    period = match.group(3).lower()

    if period == "pm" and hour != 12:
        hour += 12
    if period == "am" and hour == 12:
        hour = 0

    now_local = datetime.now()
    scheduled = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if scheduled <= now_local:
        scheduled += timedelta(days=1)

    return scheduled


def _extract_device(text: str) -> str:
    """Map natural language to a Home Assistant entity id."""

    search_text = _normalise_text(text)
    aliases = _get_aliases()

    best_match: str | None = None
    best_priority = len(_DOMAIN_PREFERENCE)

    for entity_id, candidates in aliases.items():
        if not candidates:
            continue
        if any(candidate in search_text for candidate in candidates):
            domain = entity_id.split(".")[0]
            try:
                priority = _DOMAIN_PREFERENCE.index(domain)
            except ValueError:
                priority = len(_DOMAIN_PREFERENCE)
            if best_match is None or priority < best_priority:
                best_match = entity_id
                best_priority = priority

    if best_match:
        return best_match

    # domain fallbacks by keyword if nothing matched aliases
    if "thermostat" in search_text or "temperature" in search_text:
        for entity_id in aliases:
            if entity_id.startswith("climate."):
                return entity_id
    if "garage" in search_text and any(e.startswith("cover.") for e in aliases):
        return next(e for e in aliases if e.startswith("cover."))

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
    scheduled_time = _extract_scheduled_time(text)

    if "turn on" in lower_text or "turn off" in lower_text:
        state = "turn on" in lower_text
        device = _extract_device(lower_text)
        intent = ChatIntent(type="ToggleDevice", device=device, state=state)
        if scheduled_time:
            intent.runAt = scheduled_time.isoformat()
        return intent

    if "set" in lower_text and "%" in lower_text:
        level = _extract_percentage(lower_text)
        device = _extract_device(lower_text)
        intent = ChatIntent(type="SetLevel", device=device, level=level)
        if scheduled_time:
            intent.runAt = scheduled_time.isoformat()
        return intent

    if "temperature" in lower_text or "degrees" in lower_text:
        temp = _extract_temperature(lower_text)
        intent = ChatIntent(type="SetLevel", device="climate.thermostat_hall", temperature=temp)
        if scheduled_time:
            intent.runAt = scheduled_time.isoformat()
        return intent

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
        now_utc = datetime.utcnow()
        next_run = queue_candidate.next_run_at
        should_enqueue_only = next_run is not None and next_run > now_utc

        if not should_enqueue_only:
            success, _, error = ha_device_service.execute_scheduled(queue_candidate)
            if not success and error:
                logger.warning("Failed to execute HA command from chat intent: %s", error)
        if should_enqueue_only:
            append_queue_command(queue_candidate)

    return ChatResult(
        intent=intent,
        response=response,
        user=user_message,
        assistant=assistant_message,
    )


__all__ = ["router"]

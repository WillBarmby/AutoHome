from __future__ import annotations

import json
import logging
import re
import subprocess
from typing import Dict, List, Optional
from uuid import uuid4

from ..models.schema import Command
from .state_store import state_store

logger = logging.getLogger(__name__)


def _run_minstrel(text: str) -> List[Dict[str, object]]:
    try:
        result = subprocess.run(
            ["ollama", "run", "smartparser", text],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        logger.warning("Minstrel parser not available; falling back to heuristics")
        return []

    output = result.stdout.strip()
    if not output:
        return []

    try:
        parsed = json.loads(output)
    except json.JSONDecodeError:
        logger.warning("Minstrel produced invalid JSON: %s", output)
        return []

    if isinstance(parsed, list):
        return [cmd for cmd in parsed if isinstance(cmd, dict)]
    if isinstance(parsed, dict):
        return [parsed]
    return []


def _fallback_parse(text: str) -> List[Dict[str, object]]:
    text_lower = text.lower()
    rooms = state_store.list_rooms()
    room_map = {room: room for room in rooms}
    for room in rooms:
        room_map[room.replace("_", " ")] = room
        room_map[room.replace("_", "")] = room

    def find_room() -> Optional[str]:
        for key, value in room_map.items():
            if key and key in text_lower:
                return value
        return None

    commands: List[Dict[str, object]] = []

    if any(keyword in text_lower for keyword in ["turn on", "switch on"]):
        device_type = _detect_device_type(text_lower)
        if device_type:
            commands.append(
                {
                    "device": device_type,
                    "action": "on",
                    "location": find_room(),
                }
            )
            return commands

    if any(keyword in text_lower for keyword in ["turn off", "switch off"]):
        device_type = _detect_device_type(text_lower)
        if device_type:
            commands.append(
                {
                    "device": device_type,
                    "action": "off",
                    "location": find_room(),
                }
            )
            return commands

    thermostat_match = re.search(r"set (?:the )?thermostat to (\d{2})", text_lower)
    if thermostat_match:
        commands.append(
            {
                "device": "thermostat",
                "action": "set_temperature",
                "value": int(thermostat_match.group(1)),
                "location": find_room(),
            }
        )
        return commands

    return commands


def _detect_device_type(text_lower: str) -> Optional[str]:
    if "light" in text_lower:
        return "light"
    if "fan" in text_lower:
        return "fan"
    if "thermostat" in text_lower or "temperature" in text_lower:
        return "thermostat"
    return None


def _normalise_action(action: str, device_type: str) -> Optional[str]:
    normalized = action.lower()
    if normalized in {"turn_on", "on", "enable"}:
        return "on"
    if normalized in {"turn_off", "off", "disable"}:
        return "off"
    if device_type == "thermostat" and normalized in {"set_temperature", "set"}:
        return "set_temperature"
    if device_type == "thermostat" and normalized.startswith("set"):
        return "set_temperature"
    return normalized if normalized in {"on", "off", "set_temperature"} else None


def _normalise_room(room: Optional[str]) -> Optional[str]:
    if not room:
        return None
    normalized = room.strip().lower().replace(" ", "_")
    rooms = set(state_store.list_rooms())
    return normalized if normalized in rooms else None


def _expand_commands(base: Dict[str, object]) -> List[Command]:
    device_type = base.get("device")
    if device_type not in {"light", "fan", "thermostat"}:
        return []

    action_raw = base.get("action", "")
    action = _normalise_action(str(action_raw), device_type)
    if not action:
        return []

    room = _normalise_room(base.get("location"))
    value = base.get("value")
    value_int = None
    if value is not None:
        try:
            value_int = int(value)
        except (TypeError, ValueError):
            pass

    commands: List[Command] = []
    if room:
        commands.append(
            Command(
                id=uuid4().hex,
                scope="room",
                room=room,
                device_type=device_type,
                action=action,
                value_f=value_int,
                source="nlp",
            )
        )
        return commands

    rooms = state_store.list_rooms()
    if not rooms:
        commands.append(
            Command(
                id=uuid4().hex,
                scope="house",
                room=None,
                device_type=device_type,
                action=action,
                value_f=value_int,
                source="nlp",
            )
        )
        return commands

    for room_name in rooms:
        commands.append(
            Command(
                id=uuid4().hex,
                scope="room",
                room=room_name,
                device_type=device_type,
                action=action,
                value_f=value_int,
                source="nlp",
            )
        )
    return commands


def parse_text_to_commands(text: str) -> List[Command]:
    raw_commands = _run_minstrel(text)
    if not raw_commands:
        raw_commands = _fallback_parse(text)

    commands: List[Command] = []
    for raw in raw_commands:
        commands.extend(_expand_commands(raw))
    return commands


__all__ = ["parse_text_to_commands"]

from __future__ import annotations

import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional

from fastapi.encoders import jsonable_encoder

from ..config import (
    DASHBOARD_PATH,
    COMMANDS_PATH,
    DEVICES_PATH,
    PREFERENCES_PATH,
    SCHEDULE_PATH,
    STATE_DIR,
)


class StateStore:
    def __init__(self) -> None:
        """Initialise the store and ensure required files are present."""

        STATE_DIR.mkdir(parents=True, exist_ok=True)
        self._ensure_seed_files()

    def load_devices(self) -> List[Dict[str, Any]]:
        """Return the cached Home Assistant entities from disk."""

        data = self._read_json(DEVICES_PATH)
        if isinstance(data, dict):
            if "entities" in data and isinstance(data["entities"], list):
                return list(data["entities"])
            if "devices" in data and isinstance(data["devices"], list):
                return list(data["devices"])
            return []
        if isinstance(data, list):
            return list(data)
        return []

    def save_devices(self, entities: List[Dict[str, Any]]) -> None:
        """Persist the provided Home Assistant entities to disk."""

        self._write_json(DEVICES_PATH, entities)

    def load_preferences(self) -> Dict[str, Any]:
        """Return stored user preferences."""

        return self._read_json(PREFERENCES_PATH)

    def save_preferences(self, data: Dict[str, Any]) -> None:
        """Persist user preferences to disk."""

        self._write_json(PREFERENCES_PATH, data)

    def load_commands(self) -> Dict[str, Any]:
        """Return the queued command collection."""

        return self._read_json(COMMANDS_PATH)

    def save_commands(self, data: Dict[str, Any]) -> None:
        """Persist queued commands, ensuring the payload is JSON serialisable."""

        data = jsonable_encoder(data)
        self._write_json(COMMANDS_PATH, data)

    def load_dashboard(self) -> Dict[str, Any]:
        """Return the dashboard state used by the UI."""

        return self._read_json(DASHBOARD_PATH)

    def save_dashboard(self, data: Dict[str, Any]) -> None:
        """Persist the dashboard state to disk."""

        data = jsonable_encoder(data)
        self._write_json(DASHBOARD_PATH, data)

    def load_schedule(self) -> Dict[str, Any]:
        """Return the automation schedule payload."""

        return self._read_json(SCHEDULE_PATH)

    def save_schedule(self, data: Dict[str, Any]) -> None:
        """Persist the automation schedule to disk."""

        data = jsonable_encoder(data)
        self._write_json(SCHEDULE_PATH, data)

    def list_rooms(self) -> List[str]:
        """Return the list of known rooms derived from cached entities."""

        rooms: set[str] = set()
        for entity in self.load_devices():
            attributes = entity.get("attributes", {}) if isinstance(entity, dict) else {}
            room = attributes.get("room") or attributes.get("area")
            if isinstance(room, str) and room:
                rooms.add(room)
        return sorted(rooms)

    def devices_by_type(self, device_type: str, room: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return cached entities filtered by Home Assistant domain and optional room."""

        matches: List[Dict[str, Any]] = []
        for entity in self.load_devices():
            if not isinstance(entity, dict):
                continue
            entity_id = entity.get("entity_id", "")
            if not isinstance(entity_id, str) or not entity_id:
                continue
            domain = entity_id.split(".")[0]
            if domain != device_type:
                continue
            if room:
                entity_room = entity.get("attributes", {}).get("room")
                if entity_room != room:
                    continue
            matches.append(entity)
        return matches

    def _ensure_seed_files(self) -> None:
        """Create default JSON payloads so the UI has data during development."""

        if not DEVICES_PATH.exists():
            self._write_json(
                DEVICES_PATH,
                [
                    {
                        "entity_id": "light.living_room",
                        "state": "off",
                        "attributes": {
                            "friendly_name": "Living Room Lamp",
                            "brightness": 0,
                            "room": "living_room",
                        },
                        "icon": "mdi:lightbulb",
                    },
                    {
                        "entity_id": "fan.bedroom",
                        "state": "off",
                        "attributes": {
                            "friendly_name": "Bedroom Fan",
                            "room": "bedroom",
                        },
                        "icon": "mdi:fan",
                    },
                    {
                        "entity_id": "climate.bedroom",
                        "state": "cool",
                        "attributes": {
                            "friendly_name": "Bedroom Thermostat",
                            "current_temperature": 72.0,
                            "temperature": 70.0,
                            "hvac_mode": "cool",
                            "room": "bedroom",
                        },
                        "icon": "mdi:thermometer",
                    },
                ],
            )
        if not PREFERENCES_PATH.exists():
            self._write_json(PREFERENCES_PATH, {})
        if not COMMANDS_PATH.exists():
            self._write_json(COMMANDS_PATH, {"pending": [], "history": []})
        if not DASHBOARD_PATH.exists():
            self._write_json(
                DASHBOARD_PATH,
                {
                    "pricing": [],
                    "vitals": {
                        "temperature": {
                            "current": 72.0,
                            "target": 72.0,
                            "outside": 85.0,
                            "deltaT": 13.0,
                            "mode": "cool",
                        },
                        "humidity": 45.0,
                        "energyCost": {
                            "current": 15.2,
                            "daily": 4.85,
                            "monthly": 142.3,
                        },
                    },
                    "chat_history": [],
                    "approval_queue": [],
                    "operation_mode": "auto",
                },
            )
        if not SCHEDULE_PATH.exists():
            self._write_json(
                SCHEDULE_PATH,
                {
                    "daily": [],
                    "queue": [],
                    "updatedAt": None,
                },
            )

    def _read_json(self, path: Path) -> Dict[str, Any]:
        """Read JSON from disk and return a Python object."""

        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        """Safely write JSON data to disk using a temporary file."""

        path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=path.parent) as tmp:
            json.dump(data, tmp, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp_path = Path(tmp.name)
        os.replace(tmp_path, path)


state_store = StateStore()


__all__ = ["state_store", "StateStore"]

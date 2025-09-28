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

    def load_devices(self) -> Dict[str, Any]:
        """Return the device collection from disk."""

        return self._read_json(DEVICES_PATH)

    def save_devices(self, data: Dict[str, Any]) -> None:
        """Persist the provided device payload to disk."""

        self._write_json(DEVICES_PATH, data)

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
        """Return the list of known rooms from the device catalogue."""

        devices = self.load_devices()
        return devices.get("rooms", [])

    def devices_by_type(self, device_type: str, room: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return devices filtered by type and optional room."""

        devices = self.load_devices().get("devices", [])
        if room:
            devices = [d for d in devices if d.get("room") == room]
        return [d for d in devices if d.get("type") == device_type]

    def _ensure_seed_files(self) -> None:
        """Create default JSON payloads so the UI has data during development."""

        if not DEVICES_PATH.exists():
            self._write_json(
                DEVICES_PATH,
                {
                    "rooms": ["bedroom", "living_room"],
                    "devices": [
                        {
                            "id": "bedroom_light",
                            "room": "bedroom",
                            "type": "light",
                            "name": "Bedroom Light",
                        },
                        {
                            "id": "bedroom_fan",
                            "room": "bedroom",
                            "type": "fan",
                            "name": "Bedroom Fan",
                        },
                        {
                            "id": "bedroom_thermostat",
                            "room": "bedroom",
                            "type": "thermostat",
                            "name": "Bedroom Thermostat",
                        },
                        {
                            "id": "living_light",
                            "room": "living_room",
                            "type": "light",
                            "name": "Living Room Light",
                        },
                        {
                            "id": "living_fan",
                            "room": "living_room",
                            "type": "fan",
                            "name": "Living Room Fan",
                        },
                        {
                            "id": "living_thermostat",
                            "room": "living_room",
                            "type": "thermostat",
                            "name": "Living Room Thermostat",
                        },
                    ],
                },
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

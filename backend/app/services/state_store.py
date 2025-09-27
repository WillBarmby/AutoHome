from __future__ import annotations

import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List

from fastapi.encoders import jsonable_encoder

from ..config import COMMANDS_PATH, DEVICES_PATH, PREFERENCES_PATH, STATE_DIR


class StateStore:
    def __init__(self) -> None:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        self._ensure_seed_files()

    def load_devices(self) -> Dict[str, Any]:
        return self._read_json(DEVICES_PATH)

    def save_devices(self, data: Dict[str, Any]) -> None:
        self._write_json(DEVICES_PATH, data)

    def load_preferences(self) -> Dict[str, Any]:
        return self._read_json(PREFERENCES_PATH)

    def save_preferences(self, data: Dict[str, Any]) -> None:
        self._write_json(PREFERENCES_PATH, data)

    def load_commands(self) -> Dict[str, Any]:
        return self._read_json(COMMANDS_PATH)

    def save_commands(self, data: Dict[str, Any]) -> None:
        data = jsonable_encoder(data)
        self._write_json(COMMANDS_PATH, data)

    def list_rooms(self) -> List[str]:
        devices = self.load_devices()
        return devices.get("rooms", [])

    def devices_by_type(self, device_type: str, room: str | None = None) -> List[Dict[str, Any]]:
        devices = self.load_devices().get("devices", [])
        if room:
            devices = [d for d in devices if d.get("room") == room]
        return [d for d in devices if d.get("type") == device_type]

    def _ensure_seed_files(self) -> None:
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

    def _read_json(self, path: Path) -> Dict[str, Any]:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=path.parent) as tmp:
            json.dump(data, tmp, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp_path = Path(tmp.name)
        os.replace(tmp_path, path)


state_store = StateStore()


__all__ = ["state_store", "StateStore"]

from __future__ import annotations

import logging
from typing import Dict, List

import httpx

from ..config import HA_BASE_URL, HA_TOKEN, MOCK_HA
from ..models.schema import Command
from .state_store import state_store

logger = logging.getLogger(__name__)


class HAClient:
    def __init__(self) -> None:
        self._session = None

    def _resolve_targets(self, command: Command) -> List[Dict[str, str]]:
        if command.scope == "room" and command.room:
            return state_store.devices_by_type(command.device_type, room=command.room)
        return state_store.devices_by_type(command.device_type)

    def execute(self, command: Command) -> Dict[str, object]:
        devices = self._resolve_targets(command)
        if not devices:
            logger.warning("No devices found for command %s", command.id)
            return {"command_id": command.id, "status": "no_devices"}

        if MOCK_HA:
            return self._mock_execute(command, devices)
        return self._real_execute(command, devices)

    def _mock_execute(self, command: Command, devices: List[Dict[str, str]]) -> Dict[str, object]:
        logger.info("[MOCK] Executing %s on %d devices", command.id, len(devices))
        actions: List[Dict[str, object]] = []
        for device in devices:
            actions.append(
                {
                    "device_id": device["id"],
                    "action": command.action,
                    "value_f": command.value_f,
                }
            )
        return {
            "command_id": command.id,
            "status": "mocked",
            "devices": actions,
        }

    def _real_execute(self, command: Command, devices: List[Dict[str, str]]) -> Dict[str, object]:
        if not HA_BASE_URL or not HA_TOKEN:
            raise RuntimeError("HA_BASE_URL and HA_TOKEN must be set for real mode")

        headers = {
            "Authorization": f"Bearer {HA_TOKEN}",
            "Content-Type": "application/json",
        }
        results: List[Dict[str, object]] = []
        with httpx.Client(base_url=HA_BASE_URL, headers=headers, timeout=10) as client:
            for device in devices:
                payload: Dict[str, object]
                domain: str
                service: str
                if command.device_type in {"light", "fan"}:
                    domain = command.device_type
                    service = "turn_on" if command.action == "on" else "turn_off"
                    payload = {"entity_id": device.get("ha_entity_id", device["id"]) }
                elif command.device_type == "thermostat":
                    domain = "climate"
                    service = "set_temperature"
                    payload = {
                        "entity_id": device.get("ha_entity_id", device["id"]),
                        "temperature": command.value_f,
                    }
                else:
                    raise ValueError(f"Unsupported device type {command.device_type}")

                url = f"/api/services/{domain}/{service}"
                response = client.post(url, json=payload)
                response.raise_for_status()
                results.append(
                    {
                        "device_id": device["id"],
                        "response": response.json() if response.content else None,
                    }
                )
        return {
            "command_id": command.id,
            "status": "ok",
            "devices": results,
        }


ha_client = HAClient()


__all__ = ["ha_client", "HAClient"]

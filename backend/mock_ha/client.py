"""A lightweight stand-in for the Home Assistant API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from backend.db import Command, CommandStatus, Device


class MockHomeAssistantClient:
    """Provides deterministic device interactions for development."""

    async def apply(self, device: Device, command: Command) -> Dict[str, Any]:
        """Apply a command to a device and return the resulting state."""

        state = device.state.copy()
        action = command.action
        params = command.parameters

        if action == "turn_on":
            state["power"] = "on"
            if "brightness" in params:
                state["brightness"] = max(0, min(100, int(params["brightness"])))
        elif action == "turn_off":
            state["power"] = "off"
        elif action == "set_brightness":
            state["power"] = state.get("power", "on")
            state["brightness"] = max(0, min(100, int(params.get("brightness", 100))))
        elif action == "set_temperature":
            temperature = float(params.get("temperature", device.state.get("temperature", 21)))
            state["temperature"] = temperature
        else:
            raise ValueError(f"Unsupported action '{action}' for device '{device.id}'.")

        state["last_synced"] = datetime.utcnow().isoformat()
        return state


__all__ = ["MockHomeAssistantClient"]

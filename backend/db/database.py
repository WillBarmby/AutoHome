"""Thread-safe in-memory database for the AutoHome backend."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, Iterable, List

from .models import AutomationLog, Command, Device, Guardrail


class RecordNotFoundError(KeyError):
    """Raised when a requested record does not exist."""


class InMemoryDatabase:
    """A lightweight persistence layer backed by Python data structures."""

    def __init__(self) -> None:
        self._devices: Dict[str, Device] = {}
        self._commands: Dict[str, Command] = {}
        self._guardrails: Dict[str, Guardrail] = {}
        self._logs: List[AutomationLog] = []
        self._lock = asyncio.Lock()
        self._seed_defaults()

    async def list_devices(self) -> List[Device]:
        async with self._lock:
            return [device.model_copy(deep=True) for device in self._devices.values()]

    async def get_device(self, device_id: str) -> Device:
        async with self._lock:
            try:
                return self._devices[device_id].model_copy(deep=True)
            except KeyError as exc:
                raise RecordNotFoundError(device_id) from exc

    async def upsert_device(self, device: Device) -> Device:
        async with self._lock:
            device.last_updated = datetime.utcnow()
            self._devices[device.id] = device.model_copy(deep=True)
            return device

    async def list_commands(self) -> List[Command]:
        async with self._lock:
            return [command.model_copy(deep=True) for command in self._commands.values()]

    async def get_command(self, command_id: str) -> Command:
        async with self._lock:
            try:
                return self._commands[command_id].model_copy(deep=True)
            except KeyError as exc:
                raise RecordNotFoundError(command_id) from exc

    async def upsert_command(self, command: Command) -> Command:
        async with self._lock:
            self._commands[command.id] = command.model_copy(deep=True)
            return command

    async def list_guardrails(self) -> List[Guardrail]:
        async with self._lock:
            return [guardrail.model_copy(deep=True) for guardrail in self._guardrails.values()]

    async def get_guardrail(self, guardrail_id: str) -> Guardrail:
        async with self._lock:
            try:
                return self._guardrails[guardrail_id].model_copy(deep=True)
            except KeyError as exc:
                raise RecordNotFoundError(guardrail_id) from exc

    async def upsert_guardrail(self, guardrail: Guardrail) -> Guardrail:
        async with self._lock:
            self._guardrails[guardrail.id] = guardrail.model_copy(deep=True)
            return guardrail

    async def delete_guardrail(self, guardrail_id: str) -> None:
        async with self._lock:
            try:
                del self._guardrails[guardrail_id]
            except KeyError as exc:
                raise RecordNotFoundError(guardrail_id) from exc

    async def add_log_entries(self, entries: Iterable[AutomationLog]) -> None:
        async with self._lock:
            self._logs.extend(entry.model_copy(deep=True) for entry in entries)

    async def list_logs(self) -> List[AutomationLog]:
        async with self._lock:
            return [entry.model_copy(deep=True) for entry in self._logs]

    def _seed_defaults(self) -> None:
        """Populate the store with baseline devices and guardrails."""

        now = datetime.utcnow()
        living_room_light = Device(
            id="living-room-light",
            name="Living Room Lamp",
            type="light",
            area="Living Room",
            capabilities=["turn_on", "turn_off", "set_brightness"],
            state={"power": "off", "brightness": 0},
            last_updated=now,
        )
        thermostat = Device(
            id="hallway-thermostat",
            name="Hallway Thermostat",
            type="thermostat",
            area="Hallway",
            capabilities=["set_temperature", "turn_on", "turn_off"],
            state={"power": "on", "temperature": 21},
            last_updated=now,
        )
        office_switch = Device(
            id="office-switch",
            name="Office Switch",
            type="switch",
            area="Office",
            capabilities=["turn_on", "turn_off"],
            state={"power": "off"},
            last_updated=now,
        )

        brightness_guardrail = Guardrail(
            id="brightness-limit",
            name="Brightness limit",
            description="Prevents lights from exceeding 90% brightness.",
            max_brightness=90,
        )

        allowed_action_guardrail = Guardrail(
            id="thermostat-allowed-actions",
            name="Thermostat safety",
            description="Restrict thermostat commands to temperature adjustments only.",
            allowed_actions=["set_temperature"],
            blocked_devices=[thermostat.id],
        )

        self._devices = {
            living_room_light.id: living_room_light,
            thermostat.id: thermostat,
            office_switch.id: office_switch,
        }
        self._guardrails = {
            brightness_guardrail.id: brightness_guardrail,
            allowed_action_guardrail.id: allowed_action_guardrail,
        }


__all__ = ["InMemoryDatabase", "RecordNotFoundError"]

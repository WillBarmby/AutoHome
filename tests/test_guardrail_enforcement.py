"""Unit tests covering guardrail enforcement behaviour."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.db.models import Command, Device, Guardrail, GuardrailViolation


def _thermostat_guardrail() -> Guardrail:
    """Create a thermostat guardrail limited to temperature changes."""

    return Guardrail(
        id="thermostat-allowed-actions",
        name="Thermostat safety",
        allowed_actions=["set_temperature"],
        target_devices=["hallway-thermostat"],
    )


def _thermostat_device() -> Device:
    return Device(id="hallway-thermostat", name="Hallway Thermostat", type="thermostat")


def _light_device() -> Device:
    return Device(id="living-room-light", name="Living Room Light", type="light")


def test_guardrail_allows_temperature_adjustments_for_targeted_thermostat() -> None:
    guardrail = _thermostat_guardrail()
    thermostat = _thermostat_device()
    command = Command(device_id=thermostat.id, action="set_temperature", parameters={"temperature": 23})

    # Should not raise because the thermostat is targeted and the action is explicitly allowed.
    guardrail.enforce(command, thermostat)


def test_guardrail_blocks_disallowed_actions_for_targeted_thermostat() -> None:
    guardrail = _thermostat_guardrail()
    thermostat = _thermostat_device()
    command = Command(device_id=thermostat.id, action="turn_off")

    with pytest.raises(GuardrailViolation):
        guardrail.enforce(command, thermostat)


def test_guardrail_does_not_block_other_devices_when_targeted() -> None:
    guardrail = _thermostat_guardrail()
    light = _light_device()
    command = Command(device_id=light.id, action="turn_on")

    # Guardrail targets only the thermostat, so light commands should proceed unaffected.
    guardrail.enforce(command, light)


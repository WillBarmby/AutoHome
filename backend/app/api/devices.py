"""Device-related API routes.

These endpoints expose the locally cached Home Assistant entities and allow
basic command execution for development and mock environments.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import DEVICES_PATH
from ..models.schema import Command, Entity


router = APIRouter()


def _read_device_state() -> list[dict[str, Any]]:
    """Load the raw device list from the JSON state file."""

    with DEVICES_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_device_state(payload: list[dict[str, Any]]) -> None:
    """Persist the given device payload back to the JSON state file."""

    with DEVICES_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


@router.get("/devices", response_model=list[Entity])
async def get_devices() -> list[Entity]:
    """Return the set of devices currently tracked by the mock state file."""

    payload = _read_device_state()
    return [Entity(**entity) for entity in payload]


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, object]:
    """Update the mock device state to reflect the requested Home Assistant command."""

    try:
        devices = _read_device_state()
    except FileNotFoundError as error:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=500, detail=str(error)) from error

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
            if isinstance(attributes, dict):
                for key, value in cmd.data.items():
                    if key == "state":
                        continue
                    attributes[key] = value

        updated_entity = entity
        break

    if updated_entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"No entity found with id {cmd.entity_id}",
        )

    _write_device_state(devices)
    return {"status": "ok", "entity": Entity(**updated_entity).dict()}


__all__ = ["router"]


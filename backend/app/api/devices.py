"""Device-related API routes.

These endpoints expose the locally cached Home Assistant entities and allow
basic command execution for development and mock environments.
"""

from __future__ import annotations

import json
from typing import Any

import logging
from fastapi import APIRouter, HTTPException

from ..config import DEVICES_PATH, MOCK_HA
from ..models.schema import Command, Entity
from ..services.ha_thermostat_service import ha_thermostat_service


router = APIRouter()
logger = logging.getLogger(__name__)


def _normalise_entity(raw: dict[str, Any]) -> Entity:
    """Convert a heterogeneous Home Assistant payload into our Entity model."""

    attributes = raw.get("attributes", {}) or {}
    icon = raw.get("icon") or attributes.get("icon")
    entity_id = raw.get("entity_id")
    state = raw.get("state", "unknown")
    return Entity(
        entity_id=entity_id,
        state=str(state),
        attributes=attributes,
        icon=icon,
    )


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
    """Return device entities from Home Assistant, falling back to local mocks."""

    if not MOCK_HA:
        entities = ha_thermostat_service.get_all_entities()
        if entities:
            return [_normalise_entity(entity) for entity in entities]

        logger.warning("Falling back to mock devices because Home Assistant entities were unavailable")

    payload = _read_device_state()
    return [_normalise_entity(entity) for entity in payload]


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, object]:
    """Execute a device command via Home Assistant with a mock fallback."""

    if not MOCK_HA:
        service_name = cmd.service.split(".")[-1]
        payload = cmd.data or {}
        success = ha_thermostat_service.set_device_state(cmd.entity_id, service_name, payload)
        if success:
            updated = ha_thermostat_service.get_entity_state(cmd.entity_id)
            if updated is not None:
                return {"status": "ok", "entity": _normalise_entity(updated).dict()}
        logger.warning("Home Assistant command failed, reverting to mock state update", extra={"entity_id": cmd.entity_id})

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

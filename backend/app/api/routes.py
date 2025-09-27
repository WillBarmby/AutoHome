from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from ..models.schema import Command, Entity

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


STATE_FILE = Path(__file__).resolve().parents[2] / "state" / "devices.json"


@router.get("/devices", response_model=list[Entity])
async def get_devices() -> list[Entity]:
    with STATE_FILE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return [Entity(**entity) for entity in payload]


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, object]:
    try:
        with STATE_FILE.open("r", encoding="utf-8") as handle:
            devices = json.load(handle)
    except FileNotFoundError:
        return {
            "status": "error",
            "message": f"Devices state file not found at {STATE_FILE}",
        }

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
            for key, value in cmd.data.items():
                if key == "state":
                    continue
                if isinstance(attributes, dict):
                    attributes[key] = value

        updated_entity = entity
        break

    if updated_entity is None:
        return {
            "status": "error",
            "message": f"No entity found with id {cmd.entity_id}",
        }

    with STATE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(devices, handle, indent=2)

    return {
        "status": "ok",
        "entity": Entity(**updated_entity).dict(),
    }


__all__ = ["router"]

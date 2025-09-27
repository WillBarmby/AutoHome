from __future__ import annotations

from fastapi import APIRouter

from ..models.schema import Command, Entity

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/devices", response_model=list[Entity])
async def get_devices() -> list[Entity]:
    return [
        Entity(
            entity_id="light.living_room",
            state="on",
            attributes={"friendly_name": "Living Room Lamp", "brightness": 200},
            icon="mdi:lightbulb",
        ),
        Entity(
            entity_id="climate.bedroom",
            state="72.5",
            attributes={"friendly_name": "Bedroom Thermostat", "hvac_mode": "cool"},
            icon="mdi:thermometer",
        ),
    ]


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, object]:
    return {"status": "ok", "received": cmd.dict()}


__all__ = ["router"]

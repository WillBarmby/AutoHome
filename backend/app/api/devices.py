"""Device-related API routes backed by Home Assistant."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from ..models.schema import Command, Entity
from ..services.ha_device_service import ha_device_service


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/devices", response_model=list[Entity])
async def get_devices() -> list[Entity]:
    """Return the current Home Assistant entities, refreshing the cache."""

    devices = ha_device_service.get_devices(force_refresh=True)
    if not devices:
        logger.warning("No controllable devices available; returning empty list")
    return devices


@router.post("/execute")
async def execute_command(cmd: Command) -> dict[str, Any]:
    """Execute a command and mirror the result of Home Assistant."""

    success, entity, error = ha_device_service.execute_command(cmd)
    if not success or entity is None:
        raise HTTPException(status_code=500, detail=error or "Failed to execute command")

    return {"status": "ok", "entity": entity.dict()}


__all__ = ["router"]

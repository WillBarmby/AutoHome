"""Device-related API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db import Device, InMemoryDatabase, RecordNotFoundError
from backend.dependencies import get_database

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[Device], summary="List registered devices")
async def list_devices(db: InMemoryDatabase = Depends(get_database)) -> list[Device]:
    return await db.list_devices()


@router.get("/{device_id}", response_model=Device, summary="Get a device by id")
async def get_device(device_id: str, db: InMemoryDatabase = Depends(get_database)) -> Device:
    try:
        return await db.get_device(device_id)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")


@router.put("/{device_id}", response_model=Device, summary="Update device metadata")
async def update_device(device_id: str, payload: Device, db: InMemoryDatabase = Depends(get_database)) -> Device:
    if payload.id != device_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device id mismatch")
    await db.upsert_device(payload)
    return payload

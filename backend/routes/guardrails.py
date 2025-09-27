"""Guardrail configuration endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db import Guardrail, InMemoryDatabase, RecordNotFoundError
from backend.dependencies import get_database

from .schemas import GuardrailCreate

router = APIRouter(prefix="/api/guardrails", tags=["guardrails"])


@router.get("", response_model=list[Guardrail], summary="List guardrails")
async def list_guardrails(db: InMemoryDatabase = Depends(get_database)) -> list[Guardrail]:
    return await db.list_guardrails()


@router.post("", response_model=Guardrail, status_code=status.HTTP_201_CREATED, summary="Create a guardrail")
async def create_guardrail(payload: GuardrailCreate, db: InMemoryDatabase = Depends(get_database)) -> Guardrail:
    guardrail = Guardrail(**payload.model_dump())
    await db.upsert_guardrail(guardrail)
    return guardrail


@router.put("/{guardrail_id}", response_model=Guardrail, summary="Update a guardrail")
async def update_guardrail(
    guardrail_id: str,
    payload: Guardrail,
    db: InMemoryDatabase = Depends(get_database),
) -> Guardrail:
    if payload.id != guardrail_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guardrail id mismatch")
    await db.upsert_guardrail(payload)
    return payload


@router.delete("/{guardrail_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a guardrail")
async def delete_guardrail(guardrail_id: str, db: InMemoryDatabase = Depends(get_database)) -> None:
    try:
        await db.delete_guardrail(guardrail_id)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guardrail not found")

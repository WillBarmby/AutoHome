"""Command management endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db import Command, CommandStatus, GuardrailViolation, InMemoryDatabase, RecordNotFoundError
from backend.dependencies import get_command_scheduler, get_database
from backend.scheduler import CommandScheduler

from .schemas import CommandCreate

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.get("", response_model=list[Command], summary="List automation commands")
async def list_commands(db: InMemoryDatabase = Depends(get_database)) -> list[Command]:
    return await db.list_commands()


@router.post("", response_model=Command, status_code=status.HTTP_202_ACCEPTED, summary="Queue a command")
async def queue_command(
    payload: CommandCreate,
    db: InMemoryDatabase = Depends(get_database),
    scheduler: CommandScheduler = Depends(get_command_scheduler),
) -> Command:
    try:
        device = await db.get_device(payload.device_id)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target device not found")

    command = Command(device_id=payload.device_id, action=payload.action, parameters=payload.parameters)

    try:
        for guardrail in await db.list_guardrails():
            guardrail.enforce(command, device)
    except GuardrailViolation as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    command.status = CommandStatus.PENDING
    command.requested_at = datetime.utcnow()
    await scheduler.enqueue(command)
    await scheduler.start()
    return command


@router.get("/{command_id}", response_model=Command, summary="Retrieve a command")
async def get_command(command_id: str, db: InMemoryDatabase = Depends(get_database)) -> Command:
    try:
        return await db.get_command(command_id)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")


@router.delete("/{command_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a command")
async def delete_command(command_id: str, db: InMemoryDatabase = Depends(get_database)) -> None:
    try:
        command = await db.get_command(command_id)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")
    command.status = CommandStatus.FAILED
    command.error = "Command cancelled by user"
    command.completed_at = datetime.utcnow()
    await db.upsert_command(command)

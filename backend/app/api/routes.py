from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models.schema import (
    ExecuteRequest,
    ParseRequest,
    ParseResponse,
    Preferences,
    PreferencesRequest,
)
from ..services import command_bus, scheduler
from ..services.parser_service import parse_text_to_commands
from ..services.state_store import state_store

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/devices")
def get_devices() -> dict:
    return state_store.load_devices()


@router.get("/commands/pending")
def get_pending_commands() -> list:
    commands_state = state_store.load_commands()
    return commands_state.get("pending", [])


@router.get("/commands/history")
def get_command_history() -> list:
    commands_state = state_store.load_commands()
    return commands_state.get("history", [])


@router.post("/parse", response_model=ParseResponse)
def parse_command(request: ParseRequest) -> ParseResponse:
    commands = parse_text_to_commands(request.text)
    return ParseResponse(commands=commands)


@router.post("/execute")
def execute_commands(request: ExecuteRequest) -> dict:
    results = command_bus.execute_now(request.commands)
    return {"results": results}


@router.post("/commands/schedule")
def schedule_commands(request: ExecuteRequest) -> dict:
    missing = [cmd.id for cmd in request.commands if cmd.run_at is None]
    if missing:
        raise HTTPException(status_code=400, detail=f"run_at required for commands: {missing}")
    ids = command_bus.enqueue(request.commands)
    return {"queued_ids": ids}


@router.post("/preferences")
def update_preferences(request: PreferencesRequest) -> dict:
    prefs = Preferences(**request.dict())
    state_store.save_preferences(request.dict())
    scheduled = scheduler.reschedule_from_preferences(prefs)
    return {"scheduled_commands": scheduled}


@router.post("/run-due")
def run_due_commands() -> dict:
    executed = command_bus.run_due()
    return {"executed": executed}


__all__ = ["router"]

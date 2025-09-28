from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from fastapi.encoders import jsonable_encoder

from ..models.schema import Command
from .ha_client import ha_client
from .state_store import state_store


def enqueue(commands: List[Command]) -> List[str]:
    if not commands:
        return []

    state = state_store.load_commands()
    pending = state.get("pending", [])
    for command in commands:
        if command.run_at is None:
            raise ValueError("run_at is required when scheduling commands")
        pending.append(jsonable_encoder(command))
    state["pending"] = pending
    state_store.save_commands(state)
    return [command.id for command in commands]


def execute_now(commands: List[Command]) -> List[Dict[str, object]]:
    if not commands:
        return []

    state = state_store.load_commands()
    history = state.get("history", [])
    results: List[Dict[str, object]] = []
    for command in commands:
        result = ha_client.execute(command)
        results.append(result)
        history.append(
            {
                "command": jsonable_encoder(command),
                "result": result,
                "executed_at": datetime.utcnow().isoformat(),
            }
        )
    state["history"] = history
    state_store.save_commands(state)
    return results


def run_due() -> int:
    state = state_store.load_commands()
    pending_raw = state.get("pending", [])
    history = state.get("history", [])

    due: List[Command] = []
    remaining: List[Command] = []
    now = datetime.utcnow()

    for raw in pending_raw:
        command = Command.parse_obj(raw)
        if command.run_at and command.run_at <= now:
            due.append(command)
        else:
            remaining.append(command)

    executed_count = 0
    for command in due:
        result = ha_client.execute(command)
        history.append(
            {
                "command": jsonable_encoder(command),
                "result": result,
                "executed_at": datetime.utcnow().isoformat(),
            }
        )
        executed_count += 1

    state["pending"] = [jsonable_encoder(cmd) for cmd in remaining]
    state["history"] = history
    state_store.save_commands(state)
    return executed_count


__all__ = ["enqueue", "execute_now", "run_due"]

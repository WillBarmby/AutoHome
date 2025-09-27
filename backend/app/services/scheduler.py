from __future__ import annotations

from datetime import datetime, timedelta
from typing import List
from uuid import uuid4

from ..models.schema import Command, Preferences
from . import command_bus
from .state_store import state_store


def _next_run(time_str: str) -> datetime:
    hour, minute = map(int, time_str.split(":"))
    now = datetime.now()
    run_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if run_time <= now:
        run_time += timedelta(days=1)
    return run_time


def build_preference_commands(prefs: Preferences) -> List[Command]:
    commands: List[Command] = []
    if prefs.home_at and prefs.home_temp_f is not None:
        commands.append(
            Command(
                id=f"pref-{uuid4().hex}",
                scope="house",
                device_type="thermostat",
                action="set_temperature",
                value_f=prefs.home_temp_f,
                run_at=_next_run(prefs.home_at),
                source="preference",
            )
        )
    if prefs.sleep_at and prefs.sleep_temp_f is not None:
        commands.append(
            Command(
                id=f"pref-{uuid4().hex}",
                scope="house",
                device_type="thermostat",
                action="set_temperature",
                value_f=prefs.sleep_temp_f,
                run_at=_next_run(prefs.sleep_at),
                source="preference",
            )
        )
    return commands


def reschedule_from_preferences(prefs: Preferences) -> List[Command]:
    state = state_store.load_commands()
    pending = state.get("pending", [])
    pending = [
        item
        for item in pending
        if item.get("source") != "preference" or item.get("device_type") != "thermostat"
    ]
    state["pending"] = pending
    state_store.save_commands(state)

    commands = build_preference_commands(prefs)
    command_bus.enqueue(commands)
    return commands


__all__ = ["build_preference_commands", "reschedule_from_preferences"]

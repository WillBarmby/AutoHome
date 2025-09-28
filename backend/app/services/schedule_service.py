from __future__ import annotations

from datetime import datetime, timedelta, time
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi.encoders import jsonable_encoder

# ---------------------------------------------------------------------------
# Scheduling Overview
# ---------------------------------------------------------------------------
# This module holds the glue that turns high-level preferences and chat intents
# into actionable command objects. The commands themselves are stored in
# ``schedule.json`` so a background worker (or a cron-like task) can replay the
# requests against Home Assistant on a predictable cadence.
#
# We keep two buckets:
#   * ``daily`` – commands derived from saved preferences that should repeat
#     every day (e.g., pre-conditioning the thermostat before bedtime).
#   * ``queue`` – ad-hoc commands produced by the natural-language chat flow.
#
# Every helper below is heavily commented so future contributors can trace the
# data path from user input -> file storage -> eventual Home Assistant call.

from ..config import (
    DEFAULT_CITY,
    HOME_COOLING_UNITS,
    HOME_SQUARE_FOOTAGE,
    THERMOSTAT_ENTITY_ID,
)
from ..models.schema import ScheduledCommand, UserProfile
from .ha_thermostat_service import ha_thermostat_service
from .state_store import state_store


def _parse_clock_string(clock: str) -> time:
    """Convert a user friendly clock string (e.g. "9:30 PM") into a time object."""
    return datetime.strptime(clock.strip(), "%I:%M %p").time()


def _time_to_string(clock_time: time) -> str:
    """Serialize a time object to a HH:MM string for storage."""
    return clock_time.strftime("%H:%M")


def _subtract_minutes(target: time, minutes: int) -> time:
    """Move backwards by the given minutes, wrapping to the previous day if needed."""
    combined = datetime.combine(datetime.today(), target)
    shifted = combined - timedelta(minutes=minutes)
    return shifted.time()


def _resolve_current_temperature() -> Optional[float]:
    """Inspect Home Assistant for the thermostat's current temperature if possible."""
    entity = ha_thermostat_service.get_entity_state(THERMOSTAT_ENTITY_ID)
    if not entity:
        return None
    attributes = entity.get("attributes", {})
    return attributes.get("current_temperature")


def _make_command(
    *,
    description: str,
    entity_id: str,
    service: str,
    payload: Dict[str, object],
    run_time: str,
    category: str,
    lead_minutes: int,
    source: str,
    next_run: Optional[datetime] = None,
) -> ScheduledCommand:
    """Helper to build a consistently shaped ScheduledCommand instance."""
    return ScheduledCommand(
        id=uuid4().hex,
        description=description,
        entity_id=entity_id,
        service=service,
        payload=payload,
        category=category,
        run_time=run_time,
        lead_minutes=lead_minutes,
        source=source,
        created_at=datetime.utcnow(),
        next_run_at=next_run,
    )


def _store_schedule(daily: List[ScheduledCommand], queue: Optional[List[ScheduledCommand]] = None) -> None:
    """Persist the full schedule file using simple JSON structures."""
    payload = {
        "daily": jsonable_encoder(daily),
        "queue": jsonable_encoder(queue or []),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    state_store.save_schedule(payload)


def rebuild_daily_schedule(profile: UserProfile) -> List[ScheduledCommand]:
    """Create the default daily thermostat commands derived from the user's preferences.

    Steps performed:
      1. Calculate how many minutes of pre-conditioning are required before bed time
         using the same algorithm in our thermostat helper.
      2. Translate that lead time into a concrete HH:MM run slot that we repeat daily.
      3. Build structured commands that can later be converted into Home Assistant
         REST calls.
      4. Persist the "daily" bucket in schedule.json while leaving the ad-hoc
         queue untouched.
    """

    bed_time = _parse_clock_string(profile.bedTime)
    wake_time = _parse_clock_string(profile.wakeTime)

    location = profile.location or DEFAULT_CITY
    target_sleep_temp = profile.tempSleepF
    daytime_target = profile.tempAwakeF

    current_temperature = _resolve_current_temperature()
    if current_temperature is None:
        # Fall back to the awake preference if we cannot reach HA right now.
        current_temperature = daytime_target

    lead_minutes = ha_thermostat_service.calculate_time_to_temperature(
        current_temp=current_temperature,
        target_temp=target_sleep_temp,
        location=location,
        square_footage=profile.squareFootage or HOME_SQUARE_FOOTAGE,
        num_cooling_units=profile.coolingUnits or HOME_COOLING_UNITS,
    )

    if lead_minutes < 0:
        lead_minutes = 0

    start_time = _subtract_minutes(bed_time, lead_minutes)

    bedtime_command = _make_command(
        description="Pre-condition home for bedtime comfort",
        entity_id=THERMOSTAT_ENTITY_ID,
        service="set_temperature",
        payload={"temperature": target_sleep_temp},
        run_time=_time_to_string(start_time),
        category="daily",
        lead_minutes=lead_minutes,
        source="preferences",
    )

    morning_command = _make_command(
        description="Restore daytime comfort level",
        entity_id=THERMOSTAT_ENTITY_ID,
        service="set_temperature",
        payload={"temperature": daytime_target},
        run_time=_time_to_string(wake_time),
        category="daily",
        lead_minutes=0,
        source="preferences",
    )

    daily_commands = [bedtime_command, morning_command]

    light_entity = (profile.lightEntityId or "").strip() if profile.lightEntityId else ""
    if light_entity:
        def _safe_parse_clock(raw_value: Optional[str]) -> Optional[time]:
            if not raw_value:
                return None
            try:
                return _parse_clock_string(raw_value)
            except ValueError:
                return None

        friendly_label = light_entity.split(".")[-1].replace("_", " ")

        on_time = _safe_parse_clock(profile.lightsOnTime)
        if on_time:
            daily_commands.append(
                _make_command(
                    description=f"Turn on {friendly_label}",
                    entity_id=light_entity,
                    service="turn_on",
                    payload={"entity_id": light_entity},
                    run_time=_time_to_string(on_time),
                    category="daily",
                    lead_minutes=0,
                    source="preferences",
                )
            )

        off_time = _safe_parse_clock(profile.lightsOffTime)
        if off_time:
            daily_commands.append(
                _make_command(
                    description=f"Turn off {friendly_label}",
                    entity_id=light_entity,
                    service="turn_off",
                    payload={"entity_id": light_entity},
                    run_time=_time_to_string(off_time),
                    category="daily",
                    lead_minutes=0,
                    source="preferences",
                )
            )

    existing_schedule = state_store.load_schedule()
    queue_items = existing_schedule.get("queue", [])

    _store_schedule(daily_commands, queue_items)

    return daily_commands


def append_queue_command(command: ScheduledCommand) -> None:
    """Append a one-off command to the queue bucket while preserving daily tasks."""
    schedule = state_store.load_schedule()
    queue = schedule.get("queue", [])
    queue.append(jsonable_encoder(command))
    state_store.save_schedule(
        {
            "daily": schedule.get("daily", []),
            "queue": queue,
            "updatedAt": datetime.utcnow().isoformat(),
        }
    )


def queue_from_intent(summary: str, intent_payload: Dict[str, Any]) -> Optional[ScheduledCommand]:
    """Translate a parsed chat intent to a queued command ready for execution.

    The chat parser already resolves an entity domain (e.g. "light.living_room").
    We simply convert that into a Home Assistant call structure so the run loop
    can send it later. Only intents with concrete devices are supported for now.
    """
    intent_type = intent_payload.get("type")
    entity_id = intent_payload.get("device")

    if not entity_id:
        return None

    domain = entity_id.split(".")[0]

    if intent_type == "ToggleDevice":
        desired_state = intent_payload.get("state")
        if desired_state is None:
            service = "toggle"
            payload: Dict[str, Any] = {"entity_id": entity_id}
        else:
            service = "turn_on" if desired_state else "turn_off"
            payload = {"entity_id": entity_id}
    elif intent_type == "SetLevel":
        service = "turn_on"
        payload = {"entity_id": entity_id}
        if level := intent_payload.get("level"):
            # For lights we map percentage to Home Assistant brightness (0-255)
            payload["brightness_pct"] = level
        if temperature := intent_payload.get("temperature"):
            payload["temperature"] = temperature
    else:
        return None

    run_at_raw = intent_payload.get("runAt")
    scheduled_run: Optional[datetime] = None
    if isinstance(run_at_raw, str) and run_at_raw:
        try:
            scheduled_run = datetime.fromisoformat(run_at_raw)
        except ValueError:
            scheduled_run = None

    if scheduled_run is None:
        scheduled_run = datetime.utcnow()

    return _make_command(
        description=summary,
        entity_id=entity_id,
        service=service,
        payload=payload,
        category="queue",
        run_time=scheduled_run.isoformat(),
        lead_minutes=0,
        source="llm",
        next_run=scheduled_run,
    )


__all__ = [
    "append_queue_command",
    "queue_from_intent",
    "rebuild_daily_schedule",
]

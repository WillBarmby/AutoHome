from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Any, Dict, List, Optional

from ..models.schema import ScheduledCommand
from .ha_device_service import ha_device_service
from .state_store import state_store

logger = logging.getLogger(__name__)

_CHECK_INTERVAL_SECONDS = 30


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    cleaned = value.strip()
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(cleaned)
    except ValueError:
        return None


def _next_daily_occurrence(command: Dict[str, Any], reference: datetime) -> datetime:
    run_time_raw = str(command.get("run_time", "00:00"))
    try:
        scheduled_time = datetime.strptime(run_time_raw, "%H:%M").time()
    except ValueError:
        scheduled_time = time(hour=reference.hour, minute=reference.minute)

    candidate = reference.replace(
        hour=scheduled_time.hour,
        minute=scheduled_time.minute,
        second=0,
        microsecond=0,
    )
    if candidate <= reference:
        candidate += timedelta(days=1)
    return candidate


def _execute_command(command_payload: Dict[str, Any], now: datetime) -> bool:
    try:
        command = ScheduledCommand.parse_obj(command_payload)
    except Exception:
        logger.exception("Failed to deserialize scheduled command: %s", command_payload)
        return False

    success, _, error = ha_device_service.execute_scheduled(command)
    if not success and error:
        logger.warning("Scheduled command failed (%s): %s", command.id, error)
    elif success:
        logger.info("Executed scheduled command %s (%s)", command.id, command.description)
    return success


def _process_schedule(now: datetime) -> None:
    schedule = state_store.load_schedule()
    daily: List[Dict[str, Any]] = list(schedule.get("daily", []))
    queue: List[Dict[str, Any]] = list(schedule.get("queue", []))

    changed = False
    queue_ids_to_remove: List[str] = []

    for entry in daily:
        next_run = _parse_iso_datetime(entry.get("next_run_at"))
        if next_run is None:
            next_run = _next_daily_occurrence(entry, now)
            entry["next_run_at"] = next_run.isoformat()
            changed = True

        if next_run and next_run <= now:
            if _execute_command(entry, now):
                entry["last_run_at"] = now.isoformat()
                upcoming = _next_daily_occurrence(entry, now + timedelta(seconds=1))
                entry["next_run_at"] = upcoming.isoformat()
                changed = True
            else:
                retry_time = now + timedelta(minutes=5)
                entry["next_run_at"] = retry_time.isoformat()
                changed = True

    for entry in queue:
        next_run = _parse_iso_datetime(entry.get("next_run_at")) or _parse_iso_datetime(entry.get("run_time"))
        if next_run is None:
            next_run = now
            entry["next_run_at"] = next_run.isoformat()
            changed = True

        if next_run and next_run <= now:
            if _execute_command(entry, now):
                entry["last_run_at"] = now.isoformat()
                queue_ids_to_remove.append(str(entry.get("id")))
                changed = True
            else:
                retry_time = now + timedelta(minutes=5)
                entry["next_run_at"] = retry_time.isoformat()
                changed = True

    if queue_ids_to_remove:
        queue = [item for item in queue if str(item.get("id")) not in queue_ids_to_remove]

    if changed or queue_ids_to_remove:
        schedule["daily"] = daily
        schedule["queue"] = queue
        schedule["updatedAt"] = now.isoformat()
        state_store.save_schedule(schedule)


async def run_scheduler_loop(stop_event: Optional[asyncio.Event] = None) -> None:
    logger.info("Starting scheduler loop")
    try:
        while True:
            now = datetime.utcnow()
            try:
                _process_schedule(now)
            except Exception:
                logger.exception("Scheduler loop iteration failed")
            if stop_event and stop_event.is_set():
                break
            await asyncio.sleep(_CHECK_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("Scheduler loop cancelled")
        raise
    finally:
        logger.info("Scheduler loop stopped")

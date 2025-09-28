"""User profile endpoints powering the frontend settings screen."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter

from ..models.schema import UserProfile
from ..services.schedule_service import rebuild_daily_schedule
from ..services.state_store import state_store


router = APIRouter()


DEFAULT_PROFILE: Dict[str, Any] = {
    "leaveTime": "8:00 AM",
    "returnTime": "6:00 PM",
    "bedTime": "10:30 PM",
    "wakeTime": "6:30 AM",
    "tempAwakeF": 72,
    "tempSleepF": 70,
    "location": "San Francisco",
    "squareFootage": 2200,
    "coolingUnits": 1,
    "notes": "",
}


@router.get("/user-profile", response_model=UserProfile)
async def get_user_profile() -> UserProfile:
    """Return the persisted user profile merged with default values."""

    data = state_store.load_preferences()
    payload = {**DEFAULT_PROFILE, **data}
    if "updatedAt" in payload and isinstance(payload["updatedAt"], str):
        payload["updatedAt"] = datetime.fromisoformat(payload["updatedAt"])
    return UserProfile(**payload)


@router.put("/user-profile", response_model=UserProfile)
async def update_user_profile(profile: UserProfile) -> UserProfile:
    """Persist profile updates and refresh the automation schedule."""

    data = profile.dict()
    data["updatedAt"] = (profile.updatedAt or datetime.now(timezone.utc)).isoformat()
    state_store.save_preferences(data)
    rebuild_daily_schedule(profile)
    return UserProfile(**data)


__all__ = ["router"]


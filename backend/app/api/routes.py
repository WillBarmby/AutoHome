"""Aggregate API router that stitches together individual endpoint modules."""

from __future__ import annotations

from fastapi import APIRouter

from .chat import router as chat_router
from .dashboard import router as dashboard_router
from .devices import router as devices_router
from .ha import router as ha_router
from .health import router as health_router
from .user_profile import router as user_profile_router


router = APIRouter()
router.include_router(health_router)
router.include_router(devices_router)
router.include_router(dashboard_router)
router.include_router(chat_router)
router.include_router(user_profile_router)
router.include_router(ha_router)


__all__ = ["router"]


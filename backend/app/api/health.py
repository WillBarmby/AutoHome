"""Health check endpoints for the AutoHome backend."""

from __future__ import annotations

from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    """Return a simple heartbeat payload used by uptime monitors."""

    return {"status": "ok"}


__all__ = ["router"]


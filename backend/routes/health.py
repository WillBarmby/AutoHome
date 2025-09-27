"""Health check endpoint for the AutoHome backend."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Backend health check")
async def health_check() -> dict[str, str]:
    """Return the service status."""
    return {"status": "ok"}

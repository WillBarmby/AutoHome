"""Route registration for the AutoHome backend."""

from fastapi import APIRouter

from .commands import router as commands_router
from .devices import router as devices_router
from .guardrails import router as guardrails_router
from .health import router as health_router
from .parser import router as parser_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/api")
api_router.include_router(devices_router)
api_router.include_router(commands_router)
api_router.include_router(guardrails_router)
api_router.include_router(parser_router)

__all__ = ["api_router"]

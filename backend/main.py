"""Application entry point for the AutoHome backend service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.dependencies import get_command_scheduler
from routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = get_command_scheduler()
    await scheduler.start()
    try:
        yield
    finally:
        await scheduler.stop()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    app = FastAPI(title="AutoHome Backend", version="0.2.0", lifespan=lifespan)
    app.include_router(api_router)
    return app


app = create_app()

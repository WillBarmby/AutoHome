"""Application entry point for the AutoHome backend service."""

from fastapi import FastAPI

from routes import api_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="AutoHome Backend", version="0.1.0")
    app.include_router(api_router)
    return app


app = create_app()

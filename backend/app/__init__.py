from __future__ import annotations

from fastapi import FastAPI

from .api.routes import router

app = FastAPI(title="AutoHome Backend")
app.include_router(router)


__all__ = ["app"]

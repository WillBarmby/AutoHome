from __future__ import annotations

import asyncio
from contextlib import suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .services.scheduler_runner import run_scheduler_loop

app = FastAPI(title="AutoHome Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def _start_scheduler() -> None:
    app.state.scheduler_task = asyncio.create_task(run_scheduler_loop())


@app.on_event("shutdown")
async def _stop_scheduler() -> None:
    task = getattr(app.state, "scheduler_task", None)
    if task is None:
        return
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


__all__ = ["app"]

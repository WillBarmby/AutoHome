"""Background scheduler for executing commands asynchronously."""

from __future__ import annotations

import asyncio
from typing import Optional

from backend.db import Command, InMemoryDatabase
from backend.executor import CommandExecutor


class CommandScheduler:
    """Simple FIFO queue backed by an asyncio worker."""

    def __init__(self, db: InMemoryDatabase, executor: CommandExecutor) -> None:
        self._db = db
        self._executor = executor
        self._queue: "asyncio.Queue[Command | None]" = asyncio.Queue()
        self._worker: Optional[asyncio.Task[None]] = None
        self._shutdown = asyncio.Event()

    async def start(self) -> None:
        """Start the background worker if it is not already running."""

        if self._worker is None or self._worker.done():
            self._shutdown.clear()
            self._worker = asyncio.create_task(self._run())

    async def stop(self) -> None:
        """Stop the background worker and drain the queue."""

        if self._worker is None:
            return
        self._shutdown.set()
        await self._queue.put(None)
        await self._worker
        self._worker = None

    async def enqueue(self, command: Command) -> None:
        """Queue a command for execution."""

        await self._db.upsert_command(command)
        await self._queue.put(command)

    async def _run(self) -> None:
        while not self._shutdown.is_set():
            command = await self._queue.get()
            if command is None:
                break
            try:
                device = await self._db.get_device(command.device_id)
                await self._executor.execute(command, device)
            finally:
                self._queue.task_done()


__all__ = ["CommandScheduler"]

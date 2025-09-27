"""HTTP client that forwards commands to the AutoHome backend."""

from __future__ import annotations

import httpx

from backend.db import Command


class BackendExecutor:
    """Simple HTTP client used by the parser microservice to execute commands."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self._base_url)

    async def submit(self, command: Command) -> dict:
        payload = {
            "device_id": command.device_id,
            "action": command.action,
            "parameters": command.parameters,
        }
        response = await self._client.post("/api/commands", json=payload)
        response.raise_for_status()
        return response.json()

    async def aclose(self) -> None:
        await self._client.aclose()


__all__ = ["BackendExecutor"]

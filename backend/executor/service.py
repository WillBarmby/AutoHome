"""Command execution pipeline for AutoHome."""

from __future__ import annotations

from datetime import datetime

from backend.db import AutomationLog, Command, CommandStatus, Device, InMemoryDatabase
from backend.mock_ha import MockHomeAssistantClient


class CommandExecutor:
    """Applies commands to devices and records the results."""

    def __init__(self, db: InMemoryDatabase, ha_client: MockHomeAssistantClient) -> None:
        self._db = db
        self._ha_client = ha_client

    async def execute(self, command: Command, device: Device) -> Command:
        """Execute a command and persist the result."""

        command.started_at = datetime.utcnow()
        command.status = CommandStatus.IN_PROGRESS
        await self._db.upsert_command(command)

        logs: list[AutomationLog] = []

        try:
            new_state = await self._ha_client.apply(device, command)
            device.state.update(new_state)
            device.last_updated = datetime.utcnow()
            await self._db.upsert_device(device)

            command.status = CommandStatus.COMPLETED
            command.completed_at = datetime.utcnow()
            command.result = "Command executed successfully."
            logs.append(
                AutomationLog(
                    command_id=command.id,
                    message=f"Executed {command.action} on {device.name}",
                )
            )
        except Exception as exc:  # pragma: no cover - defensive
            command.status = CommandStatus.FAILED
            command.completed_at = datetime.utcnow()
            command.error = str(exc)
            logs.append(
                AutomationLog(
                    command_id=command.id,
                    message=f"Command failed: {exc}",
                )
            )

        await self._db.upsert_command(command)
        if logs:
            await self._db.add_log_entries(logs)
        return command


__all__ = ["CommandExecutor"]

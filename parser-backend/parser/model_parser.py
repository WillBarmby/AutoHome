"""Thin wrapper around the shared backend parser service."""

from __future__ import annotations

from typing import Optional

from backend.parser import CommandParser

from .schema import ParsedCommand


class ParserService:
    """Expose the shared rule-based parser behind a service interface."""

    def __init__(self) -> None:
        self._parser = CommandParser()

    def parse(self, utterance: str) -> Optional[ParsedCommand]:
        intent = self._parser.parse(utterance)
        if intent is None:
            return None
        command = self._parser.to_command(intent)
        return ParsedCommand(
            device_id=command.device_id,
            action=command.action,
            parameters=command.parameters,
        )


__all__ = ["ParserService"]

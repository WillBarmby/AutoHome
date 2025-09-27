"""Dependency wiring for the FastAPI backend."""

from __future__ import annotations

from functools import lru_cache

from backend.db import InMemoryDatabase
from backend.executor import CommandExecutor
from backend.mock_ha import MockHomeAssistantClient
from backend.parser import CommandParser
from backend.scheduler import CommandScheduler


@lru_cache(maxsize=1)
def get_database() -> InMemoryDatabase:
    return InMemoryDatabase()


@lru_cache(maxsize=1)
def get_mock_ha_client() -> MockHomeAssistantClient:
    return MockHomeAssistantClient()


@lru_cache(maxsize=1)
def get_command_executor() -> CommandExecutor:
    return CommandExecutor(get_database(), get_mock_ha_client())


@lru_cache(maxsize=1)
def get_command_scheduler() -> CommandScheduler:
    return CommandScheduler(get_database(), get_command_executor())


@lru_cache(maxsize=1)
def get_parser() -> CommandParser:
    return CommandParser()


__all__ = [
    "get_command_executor",
    "get_command_scheduler",
    "get_database",
    "get_mock_ha_client",
    "get_parser",
]

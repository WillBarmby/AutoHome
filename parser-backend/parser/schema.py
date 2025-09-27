"""Pydantic schemas for the parser microservice."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ParseRequest(BaseModel):
    utterance: str = Field(..., description="Natural language instruction from the user")


class ParsedCommand(BaseModel):
    device_id: str
    action: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ParseAndExecuteResponse(BaseModel):
    command_id: str
    status: str
    message: Optional[str] = None

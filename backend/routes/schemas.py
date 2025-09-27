"""API request/response schemas specific to the HTTP layer."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class CommandCreate(BaseModel):
    device_id: str
    action: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class GuardrailCreate(BaseModel):
    name: str
    description: Optional[str] = None
    allowed_actions: Optional[list[str]] = None
    blocked_actions: Optional[list[str]] = None
    blocked_devices: Optional[list[str]] = None
    target_devices: Optional[list[str]] = None
    max_brightness: Optional[int] = None


class ParseRequest(BaseModel):
    utterance: str

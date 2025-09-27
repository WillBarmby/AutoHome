"""Domain models for the AutoHome backend."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class CommandStatus(str, Enum):
    """Enumeration of possible command lifecycle states."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Device(BaseModel):
    """Representation of a controllable Home Assistant device."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    type: str
    area: Optional[str] = None
    capabilities: List[str] = Field(default_factory=list)
    state: Dict[str, Any] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class Command(BaseModel):
    """Command issued by the user and tracked in the system."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    device_id: str
    action: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    status: CommandStatus = CommandStatus.PENDING
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None
    error: Optional[str] = None


class GuardrailViolation(Exception):
    """Raised when a command violates a configured guardrail."""

    def __init__(self, guardrail_id: str, message: str) -> None:
        super().__init__(message)
        self.guardrail_id = guardrail_id
        self.message = message


class Guardrail(BaseModel):
    """Simple guardrail model used to validate commands."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: Optional[str] = None
    allowed_actions: Optional[List[str]] = None
    blocked_actions: Optional[List[str]] = None
    blocked_devices: Optional[List[str]] = None
    max_brightness: Optional[int] = None

    def enforce(self, command: Command, device: Device) -> None:
        """Validate a command against the rule, raising when violated."""

        if self.allowed_actions is not None and command.action not in self.allowed_actions:
            raise GuardrailViolation(
                self.id,
                f"Action '{command.action}' is not permitted by guardrail '{self.name}'.",
            )
        if self.blocked_actions is not None and command.action in self.blocked_actions:
            raise GuardrailViolation(
                self.id,
                f"Action '{command.action}' is blocked by guardrail '{self.name}'.",
            )
        if self.blocked_devices is not None and device.id in self.blocked_devices:
            raise GuardrailViolation(
                self.id,
                f"Device '{device.name}' is blocked by guardrail '{self.name}'.",
            )
        if self.max_brightness is not None and command.parameters.get("brightness") is not None:
            brightness = int(command.parameters["brightness"])
            if brightness > self.max_brightness:
                raise GuardrailViolation(
                    self.id,
                    f"Brightness {brightness} exceeds the limit set by guardrail '{self.name}'.",
                )


class AutomationLog(BaseModel):
    """Audit log entries for automation events."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    command_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


__all__ = [
    "AutomationLog",
    "Command",
    "CommandStatus",
    "Device",
    "Guardrail",
    "GuardrailViolation",
]

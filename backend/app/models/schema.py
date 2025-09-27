from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, root_validator

DeviceType = Literal["light", "fan", "thermostat"]


class Command(BaseModel):
    id: str
    scope: Literal["house", "room"]
    room: Optional[str] = None
    device_type: DeviceType
    action: Literal["on", "off", "set_temperature"]
    value_f: Optional[int] = None
    run_at: Optional[datetime] = None
    source: Literal["nlp", "preference"] = "nlp"

    @root_validator
    def _validate(cls, values: dict) -> dict:
        scope = values.get("scope")
        room = values.get("room")
        action = values.get("action")
        value = values.get("value_f")
        if scope == "room" and not room:
            raise ValueError("room is required when scope is 'room'")
        if action == "set_temperature" and value is None:
            raise ValueError("value_f is required for set_temperature")
        return values


class Device(BaseModel):
    id: str
    room: str
    type: DeviceType
    name: str


class Preferences(BaseModel):
    home_at: Optional[str] = Field(default=None, regex=r"^\d{2}:\d{2}$")
    sleep_at: Optional[str] = Field(default=None, regex=r"^\d{2}:\d{2}$")
    home_temp_f: Optional[int] = None
    sleep_temp_f: Optional[int] = None


class ParseRequest(BaseModel):
    text: str


class ParseResponse(BaseModel):
    commands: List[Command]


class ExecuteRequest(BaseModel):
    commands: List[Command]


class PreferencesRequest(Preferences):
    pass


__all__ = [
    "Command",
    "Device",
    "Preferences",
    "ParseRequest",
    "ParseResponse",
    "ExecuteRequest",
    "PreferencesRequest",
    "DeviceType",
]

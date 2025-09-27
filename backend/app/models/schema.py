from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel


class Entity(BaseModel):
    entity_id: str
    state: str
    attributes: Dict[str, Any]
    icon: Optional[str] = None


class Command(BaseModel):
    entity_id: str
    service: str
    data: Optional[Dict[str, Any]] = None


__all__ = ["Entity", "Command"]

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Entity(BaseModel):
    entity_id: str
    state: str
    attributes: Dict[str, Any]
    icon: Optional[str] = None


class Command(BaseModel):
    entity_id: str
    service: str
    data: Optional[Dict[str, Any]] = None


class ChatIntent(BaseModel):
    type: Literal[
        "ToggleDevice",
        "SetLevel",
        "ScheduleDevice",
        "RunOptimization",
        "SetPolicy",
        "QueryStatus",
    ]
    device: Optional[str] = None
    state: Optional[Any] = None
    level: Optional[int] = None
    temperature: Optional[float] = None
    before: Optional[str] = None
    after: Optional[str] = None
    deadline: Optional[str] = None
    cheapest: Optional[bool] = None
    avoid_peak: Optional[bool] = None
    parameters: Optional[Dict[str, Any]] = None
    runAt: Optional[str] = None


class ChatMessage(BaseModel):
    id: str
    type: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    intent: Optional[ChatIntent] = None


class PricePoint(BaseModel):
    hour: int = Field(ge=0, le=23)
    price_cents_kWh: float
    is_peak: bool


class VitalsTemperature(BaseModel):
    current: float
    target: float
    outside: float
    deltaT: float
    mode: str


class VitalsEnergyCost(BaseModel):
    current: float
    daily: float
    monthly: float


class DashboardVitals(BaseModel):
    temperature: VitalsTemperature
    humidity: float
    energyCost: VitalsEnergyCost


class ApprovalQueueItem(BaseModel):
    id: str
    summary: str
    intent: ChatIntent
    guardrailBadges: List[str]
    costDelta: Optional[str] = None
    comfortDelta: Optional[str] = None
    expiresAt: datetime
    status: Literal["pending", "approved", "rejected"]


class DashboardState(BaseModel):
    pricing: List[PricePoint]
    vitals: DashboardVitals
    chat_history: List[ChatMessage]
    approval_queue: List[ApprovalQueueItem]
    operation_mode: Literal["manual", "auto", "paused"]


class UserProfile(BaseModel):
    leaveTime: str
    returnTime: str
    bedTime: str
    wakeTime: str
    tempAwakeF: float
    tempSleepF: float
    location: str = "San Francisco"
    squareFootage: float = 2200
    coolingUnits: int = 1
    notes: str = ""
    lightEntityId: Optional[str] = None
    lightsOnTime: Optional[str] = None
    lightsOffTime: Optional[str] = None
    updatedAt: Optional[datetime] = None


class ScheduledCommand(BaseModel):
    id: str
    description: str
    entity_id: str
    service: str
    payload: Dict[str, Any]
    category: Literal["daily", "queue"]
    run_time: str
    lead_minutes: int = 0
    source: Literal["preferences", "llm"]
    created_at: datetime
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None


__all__ = [
    "ApprovalQueueItem",
    "ChatIntent",
    "ChatMessage",
    "Command",
    "DashboardState",
    "DashboardVitals",
    "Entity",
    "PricePoint",
    "ScheduledCommand",
    "UserProfile",
]

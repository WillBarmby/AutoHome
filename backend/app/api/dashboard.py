"""Dashboard and approval related endpoints."""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from ..models.schema import (
    ApprovalQueueItem,
    ChatIntent,
    DashboardState,
)
from ..services.state_store import state_store


router = APIRouter()


@router.get("/dashboard", response_model=DashboardState)
async def get_dashboard_state() -> DashboardState:
    """Return the dashboard snapshot rendered by the frontend."""

    payload = state_store.load_dashboard()
    return DashboardState(**payload)


class OperationModePayload(BaseModel):
    """Request body for updating the automation operation mode."""

    mode: Literal["manual", "auto", "paused"]


@router.patch("/dashboard/operation-mode", response_model=DashboardState)
async def set_operation_mode(payload: OperationModePayload) -> DashboardState:
    """Update the dashboard's operation mode flag and persist it."""

    dashboard = state_store.load_dashboard()
    dashboard["operation_mode"] = payload.mode
    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


class ApprovalUpdatePayload(BaseModel):
    """Request body for updating an approval queue item."""

    status: Literal["pending", "approved", "rejected"]


@router.patch("/dashboard/approvals/{item_id}", response_model=DashboardState)
async def update_approval_queue(item_id: str, payload: ApprovalUpdatePayload) -> DashboardState:
    """Modify a specific approval queue entry by identifier."""

    dashboard = state_store.load_dashboard()
    queue: list[Dict[str, Any]] = dashboard.get("approval_queue", [])
    for item in queue:
        if item.get("id") == item_id:
            item["status"] = payload.status
            break
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval item not found")

    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


class ApprovalCreatePayload(BaseModel):
    """Request body for appending a new approval item."""

    summary: str
    intent: ChatIntent
    guardrailBadges: List[str] = Field(default_factory=list)
    costDelta: Optional[str] = None
    comfortDelta: Optional[str] = None
    expiresInSeconds: int = Field(default=300, ge=10, le=3600)


@router.post("/dashboard/approvals", response_model=DashboardState)
async def create_approval_item(payload: ApprovalCreatePayload) -> DashboardState:
    """Insert a pending approval item and persist it to the dashboard state."""

    dashboard = state_store.load_dashboard()
    now = datetime.now(timezone.utc)
    item = ApprovalQueueItem(
        id=str(int(now.timestamp() * 1000)),
        summary=payload.summary,
        intent=payload.intent,
        guardrailBadges=payload.guardrailBadges,
        costDelta=payload.costDelta,
        comfortDelta=payload.comfortDelta,
        expiresAt=now + timedelta(seconds=payload.expiresInSeconds),
        status="pending",
    )
    queue = dashboard.setdefault("approval_queue", [])
    queue.append(jsonable_encoder(item))
    state_store.save_dashboard(dashboard)
    return DashboardState(**dashboard)


__all__ = ["router"]


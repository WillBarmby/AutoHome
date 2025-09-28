from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Optional, Tuple

from ..config import MOCK_HA
from ..models.schema import Command, Entity, ScheduledCommand
from .ha_thermostat_service import ha_thermostat_service
from .state_store import state_store


class HADeviceService:
    """Facade for syncing Home Assistant entities and executing device commands."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._last_synced: Optional[datetime] = None

    # Domains we consider "interactive" for UI purposes.
    _SUPPORTED_DOMAINS = {
        "light",
        "switch",
        "fan",
        "climate",
        "cover",
        "media_player",
        "script",
        "scene",
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def get_devices(self, force_refresh: bool = True) -> List[Entity]:
        """Return entities, refreshing from Home Assistant when possible."""

        if force_refresh and not MOCK_HA:
            refreshed = self._refresh_from_home_assistant()
            if refreshed:
                return refreshed

        return self._load_cached_entities()

    def execute_command(self, command: Command) -> Tuple[bool, Optional[Entity], Optional[str]]:
        """Execute a UI-issued command and return the updated entity."""

        service = command.service.split(".")[-1] if "." in command.service else command.service
        return self.execute_service(command.entity_id, service, command.data or {})

    def execute_scheduled(self, scheduled: ScheduledCommand) -> Tuple[bool, Optional[Entity], Optional[str]]:
        """Execute a queued command generated from natural language intents."""

        return self.execute_service(scheduled.entity_id, scheduled.service, scheduled.payload or {})

    def execute_service(
        self,
        entity_id: str,
        service: str,
        service_data: Dict[str, object] | None = None,
    ) -> Tuple[bool, Optional[Entity], Optional[str]]:
        """Execute a Home Assistant service and sync the local cache."""

        if not entity_id:
            return False, None, "Entity id is required"

        payload = service_data or {}

        if MOCK_HA:
            entity = self._update_mock_cache(entity_id, service, payload)
            return True, entity, None if entity else "Mock entity not found"

        success = ha_thermostat_service.set_device_state(entity_id, service, payload)
        if not success:
            return False, None, "Failed to execute command via Home Assistant"

        entities = self._refresh_from_home_assistant()
        entity = next((item for item in entities if item.entity_id == entity_id), None)
        return True, entity, None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _refresh_from_home_assistant(self) -> List[Entity]:
        """Fetch the current entity list from Home Assistant and cache it."""

        with self._lock:
            raw_entities = ha_thermostat_service.get_all_entities()
            if not raw_entities:
                return self._load_cached_entities()

            normalised = [self._normalise(raw) for raw in raw_entities if self._is_supported(raw)]
            state_store.save_devices([entity.dict() for entity in normalised])
            self._last_synced = datetime.now(timezone.utc)
            return normalised

    def _load_cached_entities(self) -> List[Entity]:
        cached_entities: List[Entity] = []
        for raw in state_store.load_devices():
            try:
                if self._is_supported(raw):
                    cached_entities.append(self._normalise(raw))
            except Exception:
                continue
        return cached_entities

    def _is_supported(self, raw: Dict[str, object] | Entity) -> bool:
        entity_id: Optional[str]

        if isinstance(raw, Entity):
            entity_id = raw.entity_id
        elif isinstance(raw, dict):
            entity_id = raw.get("entity_id")  # type: ignore[assignment]
        else:
            entity_id = None

        if not entity_id or not isinstance(entity_id, str):
            return False

        domain = entity_id.split(".")[0]
        return domain in self._SUPPORTED_DOMAINS

    def _normalise(self, raw: Dict[str, object]) -> Entity:
        """Convert a raw HA state payload into our Entity model."""

        if isinstance(raw, Entity):
            return raw

        entity_id = str(raw.get("entity_id"))
        state = raw.get("state", "unknown")
        raw_attributes = raw.get("attributes", {})
        attributes = dict(raw_attributes) if isinstance(raw_attributes, dict) else {}
        icon = raw.get("icon") or attributes.get("icon")

        if "friendly_name" not in attributes:
            attributes["friendly_name"] = entity_id

        return Entity(entity_id=entity_id, state=str(state), attributes=attributes, icon=icon)

    def _update_mock_cache(self, entity_id: str, service: str, payload: Dict[str, object]) -> Optional[Entity]:
        """Apply command updates to the cached mock state."""

        with self._lock:
            cache = state_store.load_devices()
            updated: Optional[Dict[str, object]] = None

            for entity in cache:
                if not isinstance(entity, dict):
                    continue
                if entity.get("entity_id") != entity_id:
                    continue

                current_state = entity.get("state")
                service_lower = service.lower()

                if service_lower.endswith("toggle") and isinstance(current_state, str):
                    entity["state"] = "off" if current_state == "on" else "on"
                elif service_lower.endswith("turn_on"):
                    entity["state"] = "on"
                elif service_lower.endswith("turn_off"):
                    entity["state"] = "off"
                elif service_lower.endswith("set_temperature") and payload.get("temperature") is not None:
                    entity["state"] = entity.get("state", "heat")
                    attributes = entity.setdefault("attributes", {})
                    if isinstance(attributes, dict):
                        attributes["temperature"] = payload.get("temperature")

                if payload:
                    attributes = entity.setdefault("attributes", {})
                    if isinstance(attributes, dict):
                        for key, value in payload.items():
                            if key == "entity_id":
                                continue
                            attributes[key] = value

                updated = entity
                break

            if updated is None:
                return None

            state_store.save_devices(cache)
            return self._normalise(updated)


ha_device_service = HADeviceService()


__all__ = ["ha_device_service", "HADeviceService"]

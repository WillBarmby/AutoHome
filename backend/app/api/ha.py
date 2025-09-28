"""Home Assistant integration endpoints."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import MOCK_HA
from ..services.ha_thermostat_service import ha_thermostat_service


router = APIRouter(prefix="/ha")


class TemperatureCalculationRequest(BaseModel):
    """Payload describing a temperature calculation request."""

    current_temp: float
    target_temp: float
    location: str
    square_footage: float = 2200
    num_cooling_units: int = 1
    arrival_time: Optional[str] = None
    send_to_ha: bool = True


@router.post("/calculate-temperature")
async def calculate_temperature(request: TemperatureCalculationRequest) -> dict[str, Any]:
    """Calculate warm-up/cool-down time and optionally push sensors to Home Assistant."""

    try:
        result = ha_thermostat_service.enhanced_calculate_time_to_temperature(
            current_temp=request.current_temp,
            target_temp=request.target_temp,
            location=request.location,
            square_footage=request.square_footage,
            num_cooling_units=request.num_cooling_units,
            send_to_ha=request.send_to_ha,
            arrival_time=request.arrival_time,
        )
        return {"status": "success", "result": result}
    except Exception as error:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=500, detail=f"Temperature calculation failed: {error}") from error


@router.get("/connection")
async def check_ha_connection() -> dict[str, Any]:
    """Report Home Assistant connectivity status."""

    is_connected = ha_thermostat_service.check_ha_connection()
    return {
        "connected": is_connected,
        "ha_url": ha_thermostat_service.ha_url,
        "mock_mode": MOCK_HA,
    }


@router.get("/entities")
async def get_ha_entities() -> list[dict[str, Any]]:
    """Return every entity known to Home Assistant."""

    entities = ha_thermostat_service.get_all_entities()
    if entities is None:
        raise HTTPException(status_code=500, detail="Failed to get entities from Home Assistant")
    return entities


@router.get("/climate-entities")
async def get_climate_entities() -> list[dict[str, Any]]:
    """Return just the climate entities from Home Assistant."""

    return ha_thermostat_service.find_climate_entities()


@router.get("/entity/{entity_id}")
async def get_entity_state(entity_id: str) -> dict[str, Any]:
    """Return the raw state payload for a specific entity."""

    state = ha_thermostat_service.get_entity_state(entity_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    return state


class ClimateControlRequest(BaseModel):
    """Payload describing a thermostat update."""

    entity_id: str
    temperature: Optional[float] = None
    hvac_mode: Optional[str] = None


@router.post("/climate/set-temperature")
async def set_climate_temperature(request: ClimateControlRequest) -> dict[str, Any]:
    """Adjust the thermostat temperature or HVAC mode for an entity."""

    if request.temperature is None and request.hvac_mode is None:
        raise HTTPException(status_code=400, detail="Either temperature or hvac_mode must be provided")

    success = ha_thermostat_service.set_climate_temperature(
        entity_id=request.entity_id,
        temperature=request.temperature or 72.0,
        hvac_mode=request.hvac_mode,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to set climate temperature")

    return {"status": "success", "message": f"Climate control updated for {request.entity_id}"}


@router.get("/weather/{city}")
async def get_weather(city: str) -> dict[str, Any]:
    """Return the current temperature for the requested city."""

    temperature = ha_thermostat_service.get_outdoor_temperature(city)
    if temperature is None:
        raise HTTPException(status_code=404, detail=f"Weather data not found for {city}")

    return {"city": city, "temperature": temperature, "unit": "°F"}


__all__ = ["router"]


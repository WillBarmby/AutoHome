from __future__ import annotations

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import requests
import json

from ..config import HA_BASE_URL, HA_TOKEN, MOCK_HA

logger = logging.getLogger(__name__)


class HAThermostatService:
    """Home Assistant thermostat service with temperature calculations"""
    
    def __init__(self) -> None:
        self.ha_url = HA_BASE_URL.rstrip('/') if HA_BASE_URL else None
        self.ha_token = HA_TOKEN
        self.ha_headers = {
            "Authorization": f"Bearer {HA_TOKEN}",
            "Content-Type": "application/json",
        } if HA_TOKEN else None
    
    def check_ha_connection(self) -> bool:
        """Check if Home Assistant connection is working"""
        if not self.ha_url or not self.ha_token:
            logger.warning("Home Assistant URL or token not configured")
            return False
        
        if MOCK_HA:
            logger.info("Using mock Home Assistant mode")
            return True
        
        try:
            response = requests.get(f"{self.ha_url}/api/", headers=self.ha_headers, timeout=5)
            response.raise_for_status()
            logger.info("Home Assistant connection successful")
            return True
        except requests.RequestException as e:
            logger.error(f"Home Assistant connection failed: {e}")
            return False
    
    def get_outdoor_temperature(self, city: str) -> Optional[float]:
        """Get current outdoor temperature from Open-Meteo API"""
        # Get coordinates
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        
        try:
            response = requests.get(geocoding_url, params={"name": city, "count": 1}, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("results"):
                logger.warning(f"City '{city}' not found")
                return None
                
            result = data["results"][0]
            latitude = result["latitude"]
            longitude = result["longitude"]
            
        except requests.RequestException as e:
            logger.error(f"Error getting coordinates: {e}")
            return None
        
        # Get weather data
        weather_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current_weather": "true",
            "temperature_unit": "fahrenheit"
        }
        
        try:
            response = requests.get(weather_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            current_temp = data["current_weather"]["temperature"]
            return round(current_temp, 1)
            
        except requests.RequestException as e:
            logger.error(f"Error fetching weather data: {e}")
            return None
    
    def get_entity_state(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get the current state of a Home Assistant entity"""
        if not self.check_ha_connection():
            return None
        
        if MOCK_HA:
            # Return mock data
            return {
                "entity_id": entity_id,
                "state": "on",
                "attributes": {
                    "current_temperature": 75.0,
                    "temperature": 72.0,
                    "hvac_mode": "cool",
                    "friendly_name": "Mock Thermostat"
                }
            }
        
        try:
            response = requests.get(
                f"{self.ha_url}/api/states/{entity_id}",
                headers=self.ha_headers,
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error getting entity state: {e}")
            return None
    
    def set_device_state(self, entity_id: str, service: str, service_data: Dict[str, Any] = None) -> bool:
        """Call a Home Assistant service to control a device"""
        if not self.check_ha_connection():
            return False
        
        if MOCK_HA:
            logger.info(f"[MOCK] Calling {service} on {entity_id}")
            return True
        
        # Parse domain from entity_id
        domain = entity_id.split('.')[0]
        
        payload = {
            "entity_id": entity_id
        }
        if service_data:
            payload.update(service_data)
        
        try:
            response = requests.post(
                f"{self.ha_url}/api/services/{domain}/{service}",
                headers=self.ha_headers,
                json=payload,
                timeout=5
            )
            response.raise_for_status()
            logger.info(f"Successfully called {domain}.{service} on {entity_id}")
            return True
        except requests.RequestException as e:
            logger.error(f"Error calling service: {e}")
            return False
    
    def set_climate_temperature(self, entity_id: str, temperature: float, hvac_mode: str = None) -> bool:
        """Set thermostat temperature"""
        service_data = {"temperature": temperature}
        if hvac_mode:
            service_data["hvac_mode"] = hvac_mode
        
        return self.set_device_state(entity_id, "set_temperature", service_data)
    
    def update_ha_sensor(self, entity_id: str, state: Any, attributes: Dict[str, Any] = None) -> bool:
        """Update or create a sensor in Home Assistant"""
        if not self.check_ha_connection():
            return False
        
        if MOCK_HA:
            logger.info(f"[MOCK] Updating sensor {entity_id} to {state}")
            return True
        
        payload = {
            "state": str(state),
            "attributes": attributes or {}
        }
        
        try:
            response = requests.post(
                f"{self.ha_url}/api/states/{entity_id}",
                headers=self.ha_headers,
                json=payload,
                timeout=5
            )
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            logger.error(f"Error updating sensor {entity_id}: {e}")
            return False
    
    def calculate_time_to_temperature(self, 
                                      current_temp: float,
                                      target_temp: float,
                                      location: str,
                                      square_footage: float = 2200,
                                      num_cooling_units: int = 1) -> int:
        """Calculate time to reach target temperature using live outdoor data"""
        # Get live outdoor temperature
        outdoor_temp = self.get_outdoor_temperature(city=location)
        
        if outdoor_temp is None:
            outdoor_temp = 75  # Fallback temperature
            logger.warning(f"Using fallback outdoor temperature: {outdoor_temp}°F")
        else:
            logger.info(f"Live outdoor temperature: {outdoor_temp}°F")
        
        # Check if already at target temperature
        if abs(current_temp - target_temp) < 0.5:
            return 0
        
        # Calculate temperature change needed
        temp_change_needed = abs(target_temp - current_temp)
        
        # Base rate per unit (°F per minute per 1000 sq ft)
        base_rate_per_unit = 0.3  # Adjusted for more realistic cooling
        
        # Calculate effective rate based on house size and number of units
        effective_rate = (base_rate_per_unit * num_cooling_units * 1000) / square_footage
        
        # Adjust for outdoor temperature impact
        temp_differential = outdoor_temp - target_temp

        if temp_differential < 0:
            outdoor_factor = max(0.3, 1.0 - (temp_differential * 0.01))
        else:
            outdoor_factor = min(1.2, 1.0 + (abs(temp_differential * 0.01)))
    
        # Apply outdoor temperature factor
        adjusted_rate = effective_rate * outdoor_factor

        if adjusted_rate <= 0:
            logger.warning("Adjusted rate is non-positive, cannot calculate time.")
            return -1
        
        else:
            # Calculate time needed
            minutes_needed = temp_change_needed / adjusted_rate
        
        return int(round(minutes_needed))
    
    def enhanced_calculate_time_to_temperature(self, 
                                              current_temp: float,
                                              target_temp: float,
                                              location: str,
                                              square_footage: float = 2200,
                                              num_cooling_units: int = 1,
                                              send_to_ha: bool = True,
                                              arrival_time: str = None) -> Dict[str, Any]:
        """Enhanced temperature calculation that returns detailed results and optionally sends to HA"""
        # Get live outdoor temperature
        outdoor_temp = self.get_outdoor_temperature(city=location)
        
        if outdoor_temp is None:
            outdoor_temp = 75  # Fallback temperature
            logger.warning(f"Using fallback outdoor temperature: {outdoor_temp}°F")
        else:
            logger.info(f"Live outdoor temperature: {outdoor_temp}°F")
        
        # Check if already at target temperature
        if abs(current_temp - target_temp) < 0.5:
            result = {
                'time_needed': 0,
                'current_temp': current_temp,
                'target_temp': target_temp,
                'outdoor_temp': outdoor_temp,
                'efficiency_factor': 1.0,
                'status': 'already_at_target'
            }
        else:
            # Calculate temperature change needed
            temp_change_needed = abs(target_temp - current_temp)
            
            # Base rate per unit (°F per minute per 1000 sq ft)
            base_rate_per_unit = 0.3  # Adjusted for more realistic cooling
            
            # Calculate effective rate based on house size and number of units
            effective_rate = (base_rate_per_unit * num_cooling_units * 1000) / square_footage
            
            # Adjust for outdoor temperature impact
            temp_differential = outdoor_temp - target_temp

            if temp_differential < 0:
                outdoor_factor = max(0.3, 1.0 - (temp_differential * 0.01))
            else:
                outdoor_factor = min(1.2, 1.0 + (abs(temp_differential * 0.01)))
        
            # Apply outdoor temperature factor
            adjusted_rate = effective_rate * outdoor_factor

            if adjusted_rate <= 0:
                minutes_needed = -1
                status = 'cannot_calculate'
            else:
                # Calculate time needed
                minutes_needed = int(round(temp_change_needed / adjusted_rate))
                status = 'calculated'
            
            result = {
                'time_needed': minutes_needed,
                'current_temp': current_temp,
                'target_temp': target_temp,
                'outdoor_temp': outdoor_temp,
                'efficiency_factor': outdoor_factor,
                'status': status,
                'square_footage': square_footage,
                'num_units': num_cooling_units,
                'location': location
            }
        
        # Send to Home Assistant if requested
        if send_to_ha and self.ha_url and self.ha_token:
            logger.info("Sending calculation results to Home Assistant...")
            self.send_calculation_to_ha(result, arrival_time=arrival_time)
        
        return result
    
    def send_calculation_to_ha(self, calculation_data: Dict[str, Any], sensor_prefix: str = "thermostat", arrival_time: str = None) -> bool:
        """Send temperature calculation results to Home Assistant as sensors"""
        if not self.check_ha_connection():
            return False
        
        try:
            # Calculate turn-on time if arrival time is provided
            turn_on_time = None
            if arrival_time and calculation_data.get('time_needed', 0) > 0:
                try:
                    # Parse arrival time
                    arrival_dt = datetime.strptime(arrival_time, "%H:%M").replace(
                        year=datetime.now().year,
                        month=datetime.now().month,
                        day=datetime.now().day
                    )
                    
                    # Calculate turn-on time (arrival - time_needed)
                    time_needed_minutes = calculation_data.get('time_needed', 0)
                    turn_on_dt = arrival_dt - timedelta(minutes=time_needed_minutes)
                    turn_on_time = turn_on_dt.strftime("%H:%M")
                except ValueError:
                    logger.warning(f"Invalid arrival time format: {arrival_time}. Use HH:MM format.")
            
            # Create/update sensors with calculation data
            sensors_to_update = [
                {
                    "entity_id": f"sensor.{sensor_prefix}_time_needed",
                    "state": calculation_data.get('time_needed', 0),
                    "attributes": {
                        "unit_of_measurement": "min",
                        "friendly_name": "Time to Target Temperature",
                        "icon": "mdi:clock"
                    }
                },
                {
                    "entity_id": f"sensor.{sensor_prefix}_current_temp",
                    "state": calculation_data.get('current_temp', 0),
                    "attributes": {
                        "unit_of_measurement": "°F",
                        "friendly_name": "Current Indoor Temperature",
                        "icon": "mdi:thermometer"
                    }
                },
                {
                    "entity_id": f"sensor.{sensor_prefix}_target_temp",
                    "state": calculation_data.get('target_temp', 0),
                    "attributes": {
                        "unit_of_measurement": "°F",
                        "friendly_name": "Target Temperature",
                        "icon": "mdi:target"
                    }
                },
                {
                    "entity_id": f"sensor.{sensor_prefix}_outdoor_temp",
                    "state": calculation_data.get('outdoor_temp', 0),
                    "attributes": {
                        "unit_of_measurement": "°F",
                        "friendly_name": "Outdoor Temperature",
                        "icon": "mdi:weather-sunny"
                    }
                },
                {
                    "entity_id": f"sensor.{sensor_prefix}_efficiency",
                    "state": calculation_data.get('efficiency_factor', 1.0),
                    "attributes": {
                        "unit_of_measurement": "%",
                        "friendly_name": "Cooling Efficiency",
                        "icon": "mdi:gauge"
                    }
                }
            ]
            
            # Add turn-on time sensor if arrival time was provided
            if turn_on_time:
                sensors_to_update.append({
                    "entity_id": f"sensor.{sensor_prefix}_turn_on_time",
                    "state": turn_on_time,
                    "attributes": {
                        "unit_of_measurement": "",
                        "friendly_name": "Thermostat Turn-On Time",
                        "icon": "mdi:clock-start",
                        "arrival_time": arrival_time,
                        "time_needed_minutes": calculation_data.get('time_needed', 0)
                    }
                })
            
            # Update each sensor
            for sensor in sensors_to_update:
                success = self.update_ha_sensor(
                    sensor["entity_id"],
                    sensor["state"],
                    sensor["attributes"]
                )
                if not success:
                    logger.error(f"Failed to update {sensor['entity_id']}")
                    return False
            
            logger.info("Successfully updated all calculation sensors in Home Assistant")
            return True
            
        except Exception as e:
            logger.error(f"Error sending calculation data: {e}")
            return False
    
    def get_all_entities(self) -> Optional[List[Dict[str, Any]]]:
        """Get all entities from Home Assistant"""
        if not self.check_ha_connection():
            return None
        
        if MOCK_HA:
            # Return mock entities
            return [
                {
                    "entity_id": "climate.living_room_thermostat",
                    "state": "cool",
                    "attributes": {
                        "current_temperature": 75.0,
                        "temperature": 72.0,
                        "hvac_mode": "cool",
                        "friendly_name": "Living Room Thermostat"
                    }
                },
                {
                    "entity_id": "light.living_room",
                    "state": "on",
                    "attributes": {
                        "brightness": 255,
                        "friendly_name": "Living Room Light"
                    }
                }
            ]
        
        try:
            response = requests.get(f"{self.ha_url}/api/states", headers=self.ha_headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error getting entities: {e}")
            return None
    
    def find_climate_entities(self) -> List[Dict[str, Any]]:
        """Find all climate (thermostat) entities"""
        entities = self.get_all_entities()
        if not entities:
            return []
        
        climate_entities = [
            entity for entity in entities 
            if entity['entity_id'].startswith('climate.')
        ]
        return climate_entities


# Global instance
ha_thermostat_service = HAThermostatService()

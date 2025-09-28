import requests
from typing import Optional, Dict, Any
import json

class SmartThermostat:
    def __init__(self, ha_url: str = None, ha_token: str = None):
        """Initialize the smart thermostat with Home Assistant connection
        
        Args:
            ha_url: Home Assistant URL (e.g., "http://192.168.1.100:8123")
            ha_token: Long-lived access token from Home Assistant
        """
        self.ha_url = ha_url.rstrip('/') if ha_url else None
        self.ha_token = ha_token
        self.ha_headers = {
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json",
        } if ha_token else None
    
    def get_outdoor_temperature(self, city: str) -> Optional[float]:
        """
        Get current outdoor temperature from Open-Meteo API
        
        Args:
            city: City name (e.g., "New York")
        
        Returns:
            Current temperature in Fahrenheit, or None if failed
        """
        # Get coordinates
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        
        try:
            response = requests.get(geocoding_url, params={"name": city, "count": 1})
            response.raise_for_status()
            data = response.json()
            
            if not data.get("results"):
                print(f"City '{city}' not found")
                return None
                
            result = data["results"][0]
            latitude = result["latitude"]
            longitude = result["longitude"]
            
        except requests.RequestException as e:
            print(f"Error getting coordinates: {e}")
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
            response = requests.get(weather_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            current_temp = data["current_weather"]["temperature"]
            return round(current_temp, 1)
            
        except requests.RequestException as e:
            print(f"Error fetching weather data: {e}")
            return None

    # =============== HOME ASSISTANT API METHODS ===============
    
    def check_ha_connection(self) -> bool:
        """Check if Home Assistant connection is working"""
        if not self.ha_url or not self.ha_token:
            print("❌ Home Assistant URL or token not configured")
            return False
        
        try:
            response = requests.get(f"{self.ha_url}/api/", headers=self.ha_headers)
            response.raise_for_status()
            print("✅ Home Assistant connection successful")
            return True
        except requests.RequestException as e:
            print(f"❌ Home Assistant connection failed: {e}")
            return False
    
    def get_entity_state(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get the current state of a Home Assistant entity
        
        Args:
            entity_id: Entity ID (e.g., "climate.living_room_thermostat")
            
        Returns:
            Entity state data or None if failed
        """
        if not self.check_ha_connection():
            return None
        
        try:
            response = requests.get(
                f"{self.ha_url}/api/states/{entity_id}",
                headers=self.ha_headers
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error getting entity state: {e}")
            return None
    
    def set_device_state(self, entity_id: str, service: str, service_data: Dict[str, Any] = None) -> bool:
        """Call a Home Assistant service to control a device
        
        Args:
            entity_id: Entity ID to control
            service: Service name (e.g., "turn_on", "turn_off", "set_temperature")
            service_data: Additional service data
            
        Returns:
            True if successful, False otherwise
        """
        if not self.check_ha_connection():
            return False
        
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
                json=payload
            )
            response.raise_for_status()
            print(f"✅ Successfully called {domain}.{service} on {entity_id}")
            return True
        except requests.RequestException as e:
            print(f"❌ Error calling service: {e}")
            return False
    
    def turn_device_on(self, entity_id: str) -> bool:
        """Turn a device on"""
        return self.set_device_state(entity_id, "turn_on")
    
    def turn_device_off(self, entity_id: str) -> bool:
        """Turn a device off"""
        return self.set_device_state(entity_id, "turn_off")
    
    def set_climate_temperature(self, entity_id: str, temperature: float, hvac_mode: str = None) -> bool:
        """Set thermostat temperature
        
        Args:
            entity_id: Climate entity ID
            temperature: Target temperature
            hvac_mode: HVAC mode ("heat", "cool", "heat_cool", "auto", "off")
        """
        service_data = {"temperature": temperature}
        if hvac_mode:
            service_data["hvac_mode"] = hvac_mode
        
        return self.set_device_state(entity_id, "set_temperature", service_data)
    
    def set_climate_hvac_mode(self, entity_id: str, hvac_mode: str) -> bool:
        """Set HVAC mode"""
        return self.set_device_state(entity_id, "set_hvac_mode", {"hvac_mode": hvac_mode})
    
    def get_all_entities(self) -> Optional[list]:
        """Get all entities from Home Assistant"""
        if not self.check_ha_connection():
            return None
        
        try:
            response = requests.get(f"{self.ha_url}/api/states", headers=self.ha_headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error getting entities: {e}")
            return None
    
    def find_climate_entities(self) -> list:
        """Find all climate (thermostat) entities"""
        entities = self.get_all_entities()
        if not entities:
            return []
        
        climate_entities = [
            entity for entity in entities 
            if entity['entity_id'].startswith('climate.')
        ]
        return climate_entities

    def calculate_time_to_temperature(self, 
                                      current_temp: float,
                                      target_temp: float,
                                      location: str,
                                      square_footage: float = 2200,
                                      num_cooling_units: int = 1) -> int:
        """
        Calculate time to reach target temperature using live outdoor data
        
        Args:
            current_temp: Current indoor temperature (°F)
            target_temp: Desired temperature (°F) 
            location: City name for weather lookup
            square_footage: House size in square feet (default: 2200)
            num_cooling_units: Number of HVAC units (default: 1)
        
        Returns:
            Time in minutes to reach target temperature
        """
        # Get live outdoor temperature
        outdoor_temp = self.get_outdoor_temperature(city=location)
        
        if outdoor_temp is None:
            outdoor_temp = 75  # Fallback temperature
            print(f"⚠️ Using fallback outdoor temperature: {outdoor_temp}°F")
        else:
            print(f"🌡️ Live outdoor temperature: {outdoor_temp}°F")
        
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
            print("⚠️ Adjusted rate is non-positive, cannot calculate time.")
            return -1
        
        else:
            # Calculate time needed
            minutes_needed = temp_change_needed / adjusted_rate
        
        return int(round(minutes_needed))

    # =============== SMART AUTOMATION METHODS ===============
    
    def send_calculation_to_ha(self, calculation_data: Dict[str, Any], sensor_prefix: str = "thermostat", arrival_time: str = None) -> bool:
        """Send temperature calculation results to Home Assistant as sensors
        
        Args:
            calculation_data: Dictionary containing calculation results
            sensor_prefix: Prefix for sensor entity names
            arrival_time: Arrival time in format "HH:MM" (e.g., "17:00" for 5pm)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.check_ha_connection():
            return False
        
        try:
            # Calculate turn-on time if arrival time is provided
            turn_on_time = None
            if arrival_time and calculation_data.get('time_needed', 0) > 0:
                from datetime import datetime, timedelta
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
                    print(f"⚠️ Invalid arrival time format: {arrival_time}. Use HH:MM format.")
            
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
                    print(f"❌ Failed to update {sensor['entity_id']}")
                    return False
            
            print("✅ Successfully updated all calculation sensors in Home Assistant")
            return True
            
        except Exception as e:
            print(f"❌ Error sending calculation data: {e}")
            return False
    
    def update_ha_sensor(self, entity_id: str, state: Any, attributes: Dict[str, Any] = None) -> bool:
        """Update or create a sensor in Home Assistant
        
        Args:
            entity_id: Sensor entity ID (e.g., "sensor.my_sensor")
            state: Sensor state value
            attributes: Sensor attributes
            
        Returns:
            True if successful, False otherwise
        """
        if not self.check_ha_connection():
            return False
        
        payload = {
            "state": str(state),
            "attributes": attributes or {}
        }
        
        try:
            response = requests.post(
                f"{self.ha_url}/api/states/{entity_id}",
                headers=self.ha_headers,
                json=payload
            )
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            print(f"❌ Error updating sensor {entity_id}: {e}")
            return False
    
    def enhanced_calculate_time_to_temperature(self, 
                                              current_temp: float,
                                              target_temp: float,
                                              location: str,
                                              square_footage: float = 2200,
                                              num_cooling_units: int = 1,
                                              send_to_ha: bool = True,
                                              arrival_time: str = None) -> Dict[str, Any]:
        """
        Enhanced temperature calculation that returns detailed results and optionally sends to HA
        
        Args:
            current_temp: Current indoor temperature (°F)
            target_temp: Desired temperature (°F) 
            location: City name for weather lookup
            square_footage: House size in square feet (default: 2200)
            num_cooling_units: Number of HVAC units (default: 1)
            send_to_ha: Whether to send results to Home Assistant
            arrival_time: Arrival time in format "HH:MM" (e.g., "17:00" for 5pm)
        
        Returns:
            Dictionary with calculation results
        """
        # Get live outdoor temperature
        outdoor_temp = self.get_outdoor_temperature(city=location)
        
        if outdoor_temp is None:
            outdoor_temp = 75  # Fallback temperature
            print(f"⚠️ Using fallback outdoor temperature: {outdoor_temp}°F")
        else:
            print(f"🌡️ Live outdoor temperature: {outdoor_temp}°F")
        
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
            print("📡 Sending calculation results to Home Assistant...")
            self.send_calculation_to_ha(result, arrival_time=arrival_time)
        
        return result

    def smart_precool(self, target_temp: float, arrival_time_minutes: int, 
                      climate_entity: str, location: str) -> bool:
        """Automatically start cooling before arrival
        
        Args:
            target_temp: Desired temperature
            arrival_time_minutes: Minutes until arrival
            climate_entity: Home Assistant climate entity ID
            location: City for weather lookup
            
        Returns:
            True if precooling started, False otherwise
        """
        # Get current temperature from Home Assistant
        state = self.get_entity_state(climate_entity)
        if not state:
            return False
        
        current_temp = float(state['attributes'].get('current_temperature', 72))
        
        # Use enhanced calculation method
        calculation_result = self.enhanced_calculate_time_to_temperature(
            current_temp=current_temp,
            target_temp=target_temp,
            location=location,
            send_to_ha=True
        )
        
        time_needed = calculation_result['time_needed']
        
        print(f"Current: {current_temp}°F, Target: {target_temp}°F")
        print(f"Time needed: {time_needed} min, Arrival: {arrival_time_minutes} min")
        
        if time_needed <= arrival_time_minutes and time_needed > 0:
            # Calculate when to start (arrival_time - time_needed)
            start_delay = arrival_time_minutes - time_needed
            print(f"🚀 Starting cooling in {start_delay} minutes")
            
            # For now, start immediately (you could add scheduling logic here)
            return self.set_climate_temperature(climate_entity, target_temp, "cool")
        else:
            print("⚠️ Not enough time to reach target temperature")
            return False

def home_assistant_demo():
    """Demo Home Assistant integration"""
    print("🏠 Home Assistant Integration Demo")
    print("=" * 40)
    
    # Get Home Assistant credentials
    ha_url = input("Home Assistant URL (e.g., http://192.168.1.100:8123): ")
    ha_token = input("Long-lived access token: ")
    
    # Initialize thermostat with HA credentials
    thermostat = SmartThermostat(ha_url=ha_url, ha_token=ha_token)
    
    # Test connection
    if not thermostat.check_ha_connection():
        return
    
    # Find climate entities
    print("\n🔍 Finding climate entities...")
    climate_entities = thermostat.find_climate_entities()
    
    if not climate_entities:
        print("No climate entities found!")
        return
    
    print("\nAvailable thermostats:")
    for i, entity in enumerate(climate_entities):
        entity_id = entity['entity_id']
        friendly_name = entity['attributes'].get('friendly_name', entity_id)
        current_temp = entity['attributes'].get('current_temperature', 'N/A')
        target_temp = entity.get('attributes', {}).get('temperature', 'N/A')
        print(f"{i+1}. {friendly_name} ({entity_id})")
        print(f"   Current: {current_temp}°F, Target: {target_temp}°F")
    
    # Let user choose a thermostat
    try:
        choice = int(input(f"\nSelect thermostat (1-{len(climate_entities)}): ")) - 1
        selected_entity = climate_entities[choice]['entity_id']
    except (ValueError, IndexError):
        print("Invalid selection!")
        return
    
    # Demo menu
    while True:
        print(f"\n🌡️ Controlling {selected_entity}")
        print("1. Get current state")
        print("2. Set temperature")
        print("3. Change HVAC mode")
        print("4. Smart precool demo")
        print("5. Exit")
        
        action = input("Choose action: ")
        
        if action == "1":
            state = thermostat.get_entity_state(selected_entity)
            if state:
                print(f"\nCurrent State: {state['state']}")
                print(f"Current Temp: {state['attributes'].get('current_temperature')}°F")
                print(f"Target Temp: {state['attributes'].get('temperature')}°F")
                print(f"HVAC Mode: {state['attributes'].get('hvac_mode')}")
        
        elif action == "2":
            try:
                temp = float(input("Target temperature: "))
                mode = input("HVAC mode (heat/cool/auto) [optional]: ") or None
                thermostat.set_climate_temperature(selected_entity, temp, mode)
            except ValueError:
                print("Invalid temperature!")
        
        elif action == "3":
            mode = input("HVAC mode (heat/cool/heat_cool/auto/off): ")
            thermostat.set_climate_hvac_mode(selected_entity, mode)
        
        elif action == "4":
            try:
                target_temp = float(input("Target temperature: "))
                arrival_minutes = int(input("Minutes until arrival: "))
                location = input("Your city: ")
                
                thermostat.smart_precool(target_temp, arrival_minutes, 
                                       selected_entity, location)
            except ValueError:
                print("Invalid input!")
        
        elif action == "5":
            break
        
        else:
            print("Invalid choice!")

def device_control_demo():
    """Demo general device control"""
    print("🔌 Device Control Demo")
    print("=" * 25)
    
    ha_url = input("Home Assistant URL: ")
    ha_token = input("Access token: ")
    
    thermostat = SmartThermostat(ha_url=ha_url, ha_token=ha_token)
    
    if not thermostat.check_ha_connection():
        return
    
    while True:
        print("\n📱 Device Control")
        print("1. Turn device ON")
        print("2. Turn device OFF")
        print("3. Get device state")
        print("4. List all entities")
        print("5. Exit")
        
        choice = input("Choose: ")
        
        if choice == "1":
            entity = input("Entity ID (e.g., light.living_room): ")
            thermostat.turn_device_on(entity)
        
        elif choice == "2":
            entity = input("Entity ID: ")
            thermostat.turn_device_off(entity)
        
        elif choice == "3":
            entity = input("Entity ID: ")
            state = thermostat.get_entity_state(entity)
            if state:
                print(f"State: {state['state']}")
                print(f"Attributes: {json.dumps(state['attributes'], indent=2)}")
        
        elif choice == "4":
            entities = thermostat.get_all_entities()
            if entities:
                print(f"\n📋 Found {len(entities)} entities:")
                for entity in entities[:10]:  # Show first 10
                    print(f"  {entity['entity_id']} - {entity['state']}")
                if len(entities) > 10:
                    print(f"  ... and {len(entities) - 10} more")
        
        elif choice == "5":
            break

def temperature_calculation_ha_demo():
    """Demo temperature calculation with Home Assistant integration"""
    print("🌡️ Temperature Calculation + Home Assistant Demo")
    print("=" * 50)
    
    # Get Home Assistant credentials
    ha_url = input("Home Assistant URL (e.g., http://192.168.1.100:8123): ")
    ha_token = input("Long-lived access token: ")
    
    # Initialize thermostat with HA credentials
    thermostat = SmartThermostat(ha_url=ha_url, ha_token=ha_token)
    
    # Test connection
    if not thermostat.check_ha_connection():
        return
    
    print("\n✅ Connected to Home Assistant!")
    print("This demo will calculate temperature timing and send results to HA as sensors.")
    
    try:
        # Get calculation inputs
        current_temp = float(input("\nCurrent indoor temperature (°F): "))
        target_temp = float(input("Target temperature (°F): "))
        location = input("Your city: ")
        square_footage = float(input("House square footage (default 2200): ") or "2200")
        num_units = int(input("Number of HVAC units (default 1): ") or "1")
        arrival_time = input("Arrival time (HH:MM format, e.g., 17:00 for 5pm) [optional]: ").strip()
        
        if not arrival_time:
            arrival_time = None
            print(f"\n🔍 Calculating with live weather data for {location}...")
        else:
            print(f"\n🔍 Calculating with live weather data for {location}...")
            print(f"🏠 Arrival time: {arrival_time}")
        
        # Perform enhanced calculation with HA integration
        result = thermostat.enhanced_calculate_time_to_temperature(
            current_temp=current_temp,
            target_temp=target_temp,
            location=location,
            square_footage=square_footage,
            num_cooling_units=num_units,
            send_to_ha=True,
            arrival_time=arrival_time
        )
        
        # Display results
        print(f"\n{'CALCULATION RESULTS':^50}")
        print("-" * 50)
        print(f"⏱️  Time needed: {result['time_needed']} minutes")
        print(f"🌡️  Current temp: {result['current_temp']}°F")
        print(f"🎯 Target temp: {result['target_temp']}°F")
        print(f"🌤️  Outdoor temp: {result['outdoor_temp']}°F")
        print(f"⚡ Efficiency: {result['efficiency_factor']:.2f}")
        print(f"📊 Status: {result['status']}")
        
        print(f"\n📡 Sensors created in Home Assistant:")
        print(f"   • sensor.thermostat_time_needed")
        print(f"   • sensor.thermostat_current_temp")
        print(f"   • sensor.thermostat_target_temp")
        print(f"   • sensor.thermostat_outdoor_temp")
        print(f"   • sensor.thermostat_efficiency")
        print(f"   • sensor.thermostat_turn_on_time (if arrival time provided)")
        
        # Show how to use in automations
        print(f"\n🤖 You can now use these sensors in Home Assistant automations!")
        print(f"   Example: When sensor.thermostat_time_needed < 30, start cooling")
        
    except ValueError:
        print("❌ Please enter valid numbers!")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_ha_sensors():
    """Test reading the created sensors from Home Assistant"""
    print("🔍 Testing Home Assistant Sensors")
    print("=" * 35)
    
    ha_url = input("Home Assistant URL: ")
    ha_token = input("Access token: ")
    
    thermostat = SmartThermostat(ha_url=ha_url, ha_token=ha_token)
    
    if not thermostat.check_ha_connection():
        return
    
    # List of sensors to check
    sensors_to_check = [
        "sensor.thermostat_time_needed",
        "sensor.thermostat_current_temp", 
        "sensor.thermostat_target_temp",
        "sensor.thermostat_outdoor_temp",
        "sensor.thermostat_efficiency",
        "sensor.thermostat_turn_on_time"
    ]
    
    print(f"\n📊 Checking sensor states:")
    print("-" * 40)
    
    for sensor in sensors_to_check:
        state = thermostat.get_entity_state(sensor)
        if state:
            print(f"✅ {sensor}: {state['state']} {state['attributes'].get('unit_of_measurement', '')}")
        else:
            print(f"❌ {sensor}: Not found")
    
    print(f"\n💡 Tip: You can view these sensors in Home Assistant:")
    print(f"   • Go to Settings > Devices & Services > Entities")
    print(f"   • Search for 'thermostat'")
    print(f"   • Add them to your dashboard!")

# Update the existing main section
def quick_calculator():
    """Simple calculator - just temps and location"""
    thermostat = SmartThermostat()
    
    print("🏠 Smart Thermostat Calculator")
    print("=" * 35)
    
    try:
        location = input("Your city: ")
        current_temp = float(input("Current indoor temp (°F): "))
        target_temp = float(input("Target temp (°F): "))
        
        print(f"\nUsing defaults: 2,200 sq ft, 1 HVAC unit")
        
        minutes = thermostat.calculate_time_to_temperature(
            current_temp=current_temp,
            target_temp=target_temp,
            location=location
        )
        
        print(f"\n⏱️  Time needed: {minutes} minutes ({minutes/60:.1f} hours)")
        
    except ValueError:
        print("Please enter valid numbers!")

def full_input_demo():
    """Demo where user inputs all parameters"""
    thermostat = SmartThermostat()
    
    print("🏡 Full Input Demo")
    print("=" * 35)
    
    try:
        # Get all inputs from user
        current_temp = float(input("Current indoor temperature (°F): "))
        target_temp = float(input("Desired temperature (°F): "))
        square_footage = float(input("House square footage: "))
        num_units = int(input("Number of HVAC units: "))
        location = input("Your city: ")
        
        print(f"\n🔍 Looking up weather for {location}...")
        
        # Calculate with all user inputs
        minutes = thermostat.calculate_time_to_temperature(
            current_temp=current_temp,
            target_temp=target_temp,
            location=location,
            square_footage=square_footage,
            num_cooling_units=num_units
        )
        
        # Display results
        print(f"\n{'RESULTS':^50}")
        print("-" * 50)
        print(f"Indoor: {current_temp}°F → {target_temp}°F")
        print(f"House: {square_footage:,.0f} sq ft with {num_units} HVAC unit{'s' if num_units > 1 else ''}")
        print(f"Time needed: {minutes} minutes ({minutes/60:.1f} hours)")
        
        # Energy saving tip
        if minutes > 60:
            print(f"\n💡 TIP: Start your system {minutes} minutes before arriving home!")
        
    except ValueError:
        print("Please enter valid numbers!")

def test_api():
    """Test the API with different cities"""
    print("Testing Open-Meteo API")
    print("=" * 30)
    
    test_cities = ["New York", "Los Angeles", "Chicago", "Miami", "Seattle", "Williamsburg", "Morgantown"]
    thermostat = SmartThermostat()
    
    for city in test_cities:
        print(f"\n🌍 Testing {city}...")
        temp = thermostat.get_outdoor_temperature(city=city)
        if temp:
            print(f"✅ Temperature: {temp}°F")
        else:
            print("❌ Failed to get temperature")

if __name__ == "__main__":
    print("Smart Thermostat with Home Assistant Integration")
    print("=" * 50)
    print("Choose an option:")
    print("1. Quick Calculator (uses defaults)")
    print("2. Full Input Demo (specify all details)")
    print("3. Test Weather API")
    print("4. Home Assistant Integration Demo")
    print("5. Device Control Demo")
    
    try:
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            quick_calculator()
        elif choice == "2":
            full_input_demo()
        elif choice == "3":
            test_api()
        elif choice == "4":
            home_assistant_demo()
        elif choice == "5":
            device_control_demo()
        else:
            print("Running quick calculator...")
            quick_calculator()
            
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        print("Please try again.")

# Additional utility functions for Home Assistant setup
def setup_home_assistant():
    """Helper function to guide users through Home Assistant setup"""
    print("\n🔧 Home Assistant Setup Guide")
    print("=" * 35)
    print("\n1. Find your Home Assistant URL:")
    print("   - Usually http://homeassistant.local:8123")
    print("   - Or http://100.85.243.86:8123")
    print("   - Or your external URL if using Nabu Casa")
    
    print("\n2. Create a Long-Lived Access Token:")
    print("   - Go to your Home Assistant profile")
    print("   - Scroll to 'Long-Lived Access Tokens'")
    print("   - Click 'Create Token'")
    print("   - Give it a name (e.g., 'Python Thermostat')")
    print("   - Copy the token (you won't see it again!)")
    
    print("\n3. Test your connection:")
    print("   - Use option 4 or 5 in the main menu")
    print("   - Enter your URL and token when prompted")
    
    print("\n📝 Example entity IDs:")
    print("   - climate.living_room_thermostat")
    print("   - light.bedroom_light")
    print("   - switch.living_room_fan")
    print("   - sensor.outdoor_temperature")

def create_automation_example():
    """Show example of creating a simple automation"""
    print("\n🤖 Automation Example")
    print("=" * 25)
    
    example_code = '''
# Example: Smart Pre-cooling Automation
def schedule_precool_automation(thermostat, climate_entity, location):
    """
    This function demonstrates how to create a smart pre-cooling system
    that automatically starts your AC before you arrive home.
    """
    
    # Configuration
    TARGET_TEMP = 72  # Desired temperature
    ARRIVAL_TIME = 30  # Minutes until you arrive home
    
    # Get current state from Home Assistant
    current_state = thermostat.get_entity_state(climate_entity)
    if not current_state:
        print("❌ Could not get thermostat state")
        return
    
    current_temp = current_state['attributes'].get('current_temperature', 75)
    print(f"🌡️ Current temperature: {current_temp}°F")
    
    # Calculate cooling time needed
    time_needed = thermostat.calculate_time_to_temperature(
        current_temp=current_temp,
        target_temp=TARGET_TEMP,
        location=location
    )
    
    print(f"⏱️ Time needed to cool: {time_needed} minutes")
    print(f"🏠 You'll arrive in: {ARRIVAL_TIME} minutes")
    
    # Decide whether to start cooling now
    if time_needed > 0:
        if time_needed <= ARRIVAL_TIME:
            delay = ARRIVAL_TIME - time_needed
            print(f"✅ Perfect! Starting cooling in {delay} minutes")
            print("🚀 Starting cooling now for demo...")
            
            # Start cooling
            success = thermostat.set_climate_temperature(
                climate_entity, 
                TARGET_TEMP, 
                "cool"
            )
            
            if success:
                print("❄️ Pre-cooling started successfully!")
            else:
                print("❌ Failed to start cooling")
        else:
            print("⚠️ Warning: Not enough time to reach target temperature")
            print(f"💡 Consider starting cooling {time_needed - ARRIVAL_TIME} minutes earlier")
    else:
        print("✅ Already at target temperature!")

# Usage example:
# thermostat = SmartThermostat("http://homeassistant.local:8123", "your_token_here")
# schedule_precool_automation(thermostat, "climate.main_thermostat", "New York")
'''
    
    print(example_code)

def show_api_reference():
    """Display API reference for Home Assistant methods"""
    print("\n📚 Home Assistant API Reference")
    print("=" * 40)
    
    api_ref = '''
🔧 CONNECTION METHODS:
  check_ha_connection() -> bool
    - Tests connection to Home Assistant
    - Returns True if successful

📊 STATE METHODS:
  get_entity_state(entity_id) -> dict
    - Gets current state and attributes of any entity
    - Example: get_entity_state("climate.living_room")
  
  get_all_entities() -> list
    - Returns all entities in Home Assistant
    - Useful for discovery

🎛️ CONTROL METHODS:
  turn_device_on(entity_id) -> bool
    - Turns on lights, switches, etc.
    - Example: turn_device_on("light.bedroom")
  
  turn_device_off(entity_id) -> bool
    - Turns off devices
    - Example: turn_device_off("switch.fan")
  
  set_device_state(entity_id, service, service_data) -> bool
    - Generic method to call any service
    - Example: set_device_state("light.living_room", "turn_on", 
                               {"brightness": 255, "color_name": "red"})

🌡️ CLIMATE METHODS:
  set_climate_temperature(entity_id, temperature, hvac_mode) -> bool
    - Sets thermostat temperature
    - Example: set_climate_temperature("climate.main", 72, "cool")
  
  set_climate_hvac_mode(entity_id, hvac_mode) -> bool
    - Changes HVAC mode (heat/cool/auto/off)
    - Example: set_climate_hvac_mode("climate.main", "auto")

🔍 DISCOVERY METHODS:
  find_climate_entities() -> list
    - Returns all thermostats/climate entities
    - Automatically filters for climate domain

🤖 AUTOMATION METHODS:
  smart_precool(target_temp, arrival_time, climate_entity, location) -> bool
    - Intelligent pre-cooling based on weather and timing
    - Calculates optimal start time
'''
    
    print(api_ref)

def extended_menu():
    """Extended menu with additional options"""
    print("\n🔧 Additional Options:")
    print("6. Setup Guide")
    print("7. Show API Reference") 
    print("8. Automation Example")
    print("9. Exit")
    
    choice = input("Enter choice (6-9): ").strip()
    
    if choice == "6":
        setup_home_assistant()
    elif choice == "7":
        show_api_reference()
    elif choice == "8":
        create_automation_example()
    elif choice == "9":
        return False
    else:
        print("Invalid choice!")
    
    return True

# Update the main execution block
if __name__ == "__main__":
    print("Smart Thermostat with Home Assistant Integration")
    print("=" * 50)
    
    while True:
        print("\nChoose an option:")
        print("1. Quick Calculator (uses defaults)")
        print("2. Full Input Demo (specify all details)")
        print("3. Test Weather API")
        print("4. Home Assistant Integration Demo")
        print("5. Device Control Demo")
        print("6. 🌡️ Temperature Calculation + HA Demo")
        print("7. 🔍 Test HA Sensors")
        
        try:
            choice = input("\nEnter your choice (1-7, or 'more' for additional options): ").strip().lower()
            
            if choice == "1":
                quick_calculator()
            elif choice == "2":
                full_input_demo()
            elif choice == "3":
                test_api()
            elif choice == "4":
                home_assistant_demo()
            elif choice == "5":
                device_control_demo()
            elif choice == "6":
                temperature_calculation_ha_demo()
            elif choice == "7":
                test_ha_sensors()
            elif choice in ["more", "8", "9", "10"]:
                if not extended_menu():
                    break
            elif choice in ["exit", "quit", "q"]:
                break
            else:
                print("Running quick calculator...")
                quick_calculator()
                
            # Ask if user wants to continue
            if input("\n🔄 Run another option? (y/n): ").lower().startswith('n'):
                break
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ An error occurred: {e}")
            if input("🔧 Continue anyway? (y/n): ").lower().startswith('n'):
                break

    print("\n✨ Thanks for using Smart Thermostat!")
    print("💡 Don't forget to set up your Home Assistant integration!")
    print("🐳 For Docker HA: Use http://localhost:8123 or your container IP")
    # http://localhost:8123/lovelace/0
    # eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhMjc5NWE5YmQxYTc0NmQ2YjJiOTYwNTA0ODBjMWE1MiIsImlhdCI6MTc1OTAxMDM4MCwiZXhwIjoyMDc0MzcwMzgwfQ.6JfDZR0g16kX_S8WwcuoTYnNlAqEQVykeGrqclUTw_c
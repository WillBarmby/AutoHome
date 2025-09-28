# Home Assistant Integration Guide

## Overview
This guide shows how to pass temperature calculation results from your Smart Thermostat to Home Assistant running on Docker.

## Quick Start

### 1. Get Your Home Assistant Credentials

**For Docker Home Assistant:**
- URL: `http://localhost:8123` (or your container IP)
- Token: Create a Long-Lived Access Token in HA

### 2. Run the Integration Demo

```bash
python demos.py
# Choose option 6: "🌡️ Temperature Calculation + HA Demo"
```

### 3. What Gets Created

The system creates these sensors in Home Assistant:
- `sensor.thermostat_time_needed` - Minutes to reach target temperature
- `sensor.thermostat_current_temp` - Current indoor temperature
- `sensor.thermostat_target_temp` - Target temperature
- `sensor.thermostat_outdoor_temp` - Live outdoor temperature
- `sensor.thermostat_efficiency` - Cooling efficiency factor
- `sensor.thermostat_turn_on_time` - When to turn on thermostat

## Code Examples

### Basic Usage
```python
from demos import SmartThermostat

# Initialize with Home Assistant connection
thermostat = SmartThermostat(
    ha_url="http://localhost:8123",
    ha_token="your_token_here"
)

# Calculate and send to HA
result = thermostat.enhanced_calculate_time_to_temperature(
    current_temp=78.0,
    target_temp=72.0,
    location="New York",
    send_to_ha=True  # This sends results to HA
)
```

### Advanced Usage
```python
# Get detailed calculation results
result = thermostat.enhanced_calculate_time_to_temperature(
    current_temp=78.0,
    target_temp=72.0,
    location="New York",
    square_footage=2200,
    num_cooling_units=1,
    send_to_ha=True
)

print(f"Time needed: {result['time_needed']} minutes")
print(f"Outdoor temp: {result['outdoor_temp']}°F")
print(f"Efficiency: {result['efficiency_factor']}")
```

## Home Assistant Setup

### 1. Create Long-Lived Access Token
1. Go to your Home Assistant profile
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Give it a name (e.g., "Python Thermostat")
5. Copy the token

### 2. View Your Sensors
1. Go to Settings > Devices & Services > Entities
2. Search for "thermostat"
3. You'll see your new sensors

### 3. Add to Dashboard
1. Go to your dashboard
2. Click "Add Card"
3. Choose "Entities" card
4. Add your thermostat sensors

## Automation Examples

### Auto-Start Cooling
```yaml
# In Home Assistant automations
trigger:
  - platform: numeric_state
    entity_id: sensor.thermostat_time_needed
    below: 30
    for: "00:05:00"

action:
  - service: climate.set_temperature
    target:
      entity_id: climate.your_thermostat
    data:
      temperature: "{{ states('sensor.thermostat_target_temp') }}"
      hvac_mode: cool
```

### Notify When Ready
```yaml
trigger:
  - platform: numeric_state
    entity_id: sensor.thermostat_time_needed
    below: 5

action:
  - service: notify.mobile_app_your_phone
    data:
      message: "🏠 House will be at target temperature in {{ states('sensor.thermostat_time_needed') }} minutes!"
```

## Docker-Specific Notes

### Finding Your Home Assistant URL
```bash
# If running on localhost
http://localhost:8123

# If using Docker Compose with custom network
http://homeassistant:8123

# If using host networking
http://your-host-ip:8123
```

### Testing Connection
```python
# Test your connection
thermostat = SmartThermostat(ha_url="http://localhost:8123", ha_token="your_token")
if thermostat.check_ha_connection():
    print("✅ Connected!")
else:
    print("❌ Connection failed")
```

## Troubleshooting

### Connection Issues
- Make sure Home Assistant is running
- Check the URL (localhost vs container IP)
- Verify your access token is correct
- Check if HA is accessible from your Python environment

### Sensor Not Appearing
- Wait a few minutes for sensors to appear
- Check Home Assistant logs for errors
- Verify the API call was successful
- Try refreshing the entities page

### Permission Issues
- Make sure your token has the right permissions
- Check if the token is still valid
- Try creating a new token

## API Reference

### Key Methods
- `enhanced_calculate_time_to_temperature()` - Main calculation method
- `send_calculation_to_ha()` - Send results to HA
- `update_ha_sensor()` - Update individual sensors
- `get_entity_state()` - Read sensor values
- `check_ha_connection()` - Test connection

### Return Data Structure
```python
{
    'time_needed': 45,           # Minutes to reach target
    'current_temp': 78.0,        # Current indoor temp
    'target_temp': 72.0,         # Target temperature
    'outdoor_temp': 85.0,        # Live outdoor temp
    'efficiency_factor': 0.95,   # Cooling efficiency
    'status': 'calculated',      # Calculation status
    'square_footage': 2200,     # House size
    'num_units': 1,             # HVAC units
    'location': 'New York'       # City name
}
```

## Next Steps

1. **Run the demo**: Use option 6 in the main menu
2. **Test sensors**: Use option 7 to verify sensors are working
3. **Create automations**: Use the sensors in HA automations
4. **Add to dashboard**: Display the sensors on your HA dashboard
5. **Schedule calculations**: Run calculations periodically for real-time updates

## Support

If you encounter issues:
1. Check the Home Assistant logs
2. Verify your network connectivity
3. Test with the built-in demo functions
4. Make sure all dependencies are installed (`pip install requests`)

#!/usr/bin/env python3
"""
Home Assistant Integration Example for Smart Thermostat
This script demonstrates how to pass temperature calculation results to Home Assistant
"""

from demos import SmartThermostat

def main():
    """Main example function"""
    print("🏠 Smart Thermostat - Home Assistant Integration Example")
    print("=" * 60)
    
    # Configuration - Update these with your Home Assistant details
    HA_URL = "http://localhost:8123"  # For Docker: use localhost or container IP
    HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhMjc5NWE5YmQxYTc0NmQ2YjJiOTYwNTA0ODBjMWE1MiIsImlhdCI6MTc1OTAxMDM4MCwiZXhwIjoyMDc0MzcwMzgwfQ.6JfDZR0g16kX_S8WwcuoTYnNlAqEQVykeGrqclUTw_c"
    
    # Initialize the thermostat with Home Assistant connection
    thermostat = SmartThermostat(ha_url=HA_URL, ha_token=HA_TOKEN)
    
    # Test connection
    print("🔌 Testing Home Assistant connection...")
    if not thermostat.check_ha_connection():
        print("❌ Failed to connect to Home Assistant!")
        print("💡 Make sure your HA URL and token are correct")
        return
    
    print("✅ Connected to Home Assistant!")
    
    # Example calculation parameters
    current_temp = 80.0  # Current indoor temperature
    target_temp = 69.0   # Desired temperature
    location = "Williamsburg" # Your city
    square_footage = 1600 # House size
    num_units = 1        # Number of HVAC units
    arrival_time = "17:00"  # 5:00 PM arrival time
    
    print(f"\n🌡️ Calculating cooling time...")
    print(f"   Current: {current_temp}°F")
    print(f"   Target: {target_temp}°F")
    print(f"   Location: {location}")
    print(f"   House: {square_footage} sq ft, {num_units} HVAC unit(s)")
    print(f"   Arrival: {arrival_time}")
    
    # Perform calculation and send to Home Assistant
    result = thermostat.enhanced_calculate_time_to_temperature(
        current_temp=current_temp,
        target_temp=target_temp,
        location=location,
        square_footage=square_footage,
        num_cooling_units=num_units,
        send_to_ha=True,  # This sends results to HA as sensors
        arrival_time=arrival_time  # This calculates turn-on time
    )
    
    # Display results
    print(f"\n📊 CALCULATION RESULTS:")
    print(f"   ⏱️  Time needed: {result['time_needed']} minutes")
    print(f"   🌡️  Current temp: {result['current_temp']}°F")
    print(f"   🎯 Target temp: {result['target_temp']}°F")
    print(f"   🌤️  Outdoor temp: {result['outdoor_temp']}°F")
    print(f"   ⚡ Efficiency: {result['efficiency_factor']:.2f}")
    
    print(f"\n📡 Sensors created in Home Assistant:")
    print(f"   • sensor.thermostat_time_needed")
    print(f"   • sensor.thermostat_current_temp")
    print(f"   • sensor.thermostat_target_temp")
    print(f"   • sensor.thermostat_outdoor_temp")
    print(f"   • sensor.thermostat_efficiency")
    print(f"   • sensor.thermostat_turn_on_time")
    
    # Test reading the sensors back
    print(f"\n🔍 Testing sensor reading...")
    sensors_to_check = [
        "sensor.thermostat_time_needed",
        "sensor.thermostat_current_temp",
        "sensor.thermostat_target_temp",
        "sensor.thermostat_outdoor_temp",
        "sensor.thermostat_efficiency",
        "sensor.thermostat_turn_on_time"
    ]
    
    for sensor in sensors_to_check:
        state = thermostat.get_entity_state(sensor)
        if state:
            unit = state['attributes'].get('unit_of_measurement', '')
            print(f"   ✅ {sensor}: {state['state']} {unit}")
        else:
            print(f"   ❌ {sensor}: Not found")
    
    print(f"\n🤖 Next steps:")
    print(f"   1. Go to Home Assistant > Settings > Devices & Services > Entities")
    print(f"   2. Search for 'thermostat' to see your new sensors")
    print(f"   3. Add them to your dashboard")
    print(f"   4. Create automations using these sensors!")
    
    print(f"\n💡 Example automation triggers:")
    print(f"   • When sensor.thermostat_time_needed < 30 minutes → start cooling")
    print(f"   • At sensor.thermostat_turn_on_time → start cooling")
    print(f"   • When sensor.thermostat_turn_on_time = current time → start cooling")

if __name__ == "__main__":
    main()

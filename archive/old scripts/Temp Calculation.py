"""
Smart Thermostat Model for Sustainability Hackathon
Calculates time needed to reach desired temperature based on:
- House square footage
- Number of cooling/heating units
- Outdoor temperature
"""

class SmartThermostat:
    def __init__(self):
        """Initialize the smart thermostat"""
        pass
    
    def calculate_time_to_temperature(self, 
                                      current_temp: float,
                                      target_temp: float,
                                      square_footage: float,
                                      num_cooling_units: int,
                                      outdoor_temp: float) -> int:
        """
        Calculate time in minutes to reach target temperature
        
        Args:
            current_temp: Current indoor temperature (°F)
            target_temp: Desired temperature (°F) 
            square_footage: House size in square feet
            num_cooling_units: Number of HVAC units
            outdoor_temp: Outside temperature (°F)
        
        Returns:
            Time in minutes to reach target temperature
        """
        
        # If already at target temperature
        if abs(current_temp - target_temp) < 0.5:
            return 0
        
        # Determine if heating or cooling
        heating = target_temp > current_temp
        temp_change_needed = abs(target_temp - current_temp)
        
        # Base cooling/heating rate per unit (°F per minute per 1000 sq ft)
        base_rate_per_unit = 0.05  # Adjust this based on typical HVAC performance
        
        # Calculate effective rate based on house size and number of units
        effective_rate = (base_rate_per_unit * num_cooling_units * 1000) / square_footage
        
        # Adjust for outdoor temperature impact
        if heating:
            # Heating is harder when it's colder outside
            temp_differential = abs(outdoor_temp - target_temp)
            outdoor_factor = max(0.3, 1.0 - (temp_differential * 0.01))
        else:
            # Cooling is harder when it's hotter outside  
            temp_differential = abs(outdoor_temp - target_temp)
            outdoor_factor = max(0.3, 1.0 - (temp_differential * 0.01))
        
        # Apply outdoor temperature factor
        adjusted_rate = effective_rate * outdoor_factor
        
        # Calculate time needed
        minutes_needed = temp_change_needed / adjusted_rate
        
        return int(round(minutes_needed))

def run_demo():
    """Run demo with test cases"""
    thermostat = SmartThermostat()
    
    # Test scenarios
    test_cases = [
        {
            "name": "Small house cooling",
            "current_temp": 80,
            "target_temp": 72,
            "square_footage": 1200,
            "num_units": 1,
            "outdoor_temp": 95
        },
        {
            "name": "Large house cooling", 
            "current_temp": 78,
            "target_temp": 70,
            "square_footage": 3000,
            "num_units": 2,
            "outdoor_temp": 85
        },
        {
            "name": "Heating in winter",
            "current_temp": 60,
            "target_temp": 70,
            "square_footage": 2000,
            "num_units": 1,
            "outdoor_temp": 30
        },
        {
            "name": "Mild cooling",
            "current_temp": 74,
            "target_temp": 70,
            "square_footage": 1800,
            "num_units": 1,
            "outdoor_temp": 75
        },
        {
            "name": "Multiple units - large house",
            "current_temp": 82,
            "target_temp": 68,
            "square_footage": 4500,
            "num_units": 3,
            "outdoor_temp": 100
        }
    ]
    
    print("Smart Thermostat Time Calculations")
    print("=" * 60)
    
    for test in test_cases:
        minutes = thermostat.calculate_time_to_temperature(
            current_temp=test["current_temp"],
            target_temp=test["target_temp"], 
            square_footage=test["square_footage"],
            num_cooling_units=test["num_units"],
            outdoor_temp=test["outdoor_temp"]
        )
        
        print(f"\n{test['name']}:")
        print(f"  Current: {test['current_temp']}°F → Target: {test['target_temp']}°F")
        print(f"  House: {test['square_footage']:,} sq ft, {test['num_units']} units")
        print(f"  Outdoor: {test['outdoor_temp']}°F")
        print(f"  Time needed: {minutes} minutes ({minutes/60:.1f} hours)")

def user_input_example():
    """Interactive example for user input"""
    print("\n" + "=" * 60)
    print("INTERACTIVE MODE - Enter your house details:")
    print("=" * 60)
    
    try:
        thermostat = SmartThermostat()
        
        # Get user inputs
        current_temp = float(input("Current indoor temperature (°F): "))
        target_temp = float(input("Desired temperature (°F): "))
        square_footage = float(input("House square footage: "))
        num_units = int(input("Number of HVAC units: "))
        outdoor_temp = float(input("Current outdoor temperature (°F): "))
        
        # Calculate result
        minutes = thermostat.calculate_time_to_temperature(
            current_temp=current_temp,
            target_temp=target_temp,
            square_footage=square_footage,
            num_cooling_units=num_units,
            outdoor_temp=outdoor_temp
        )
        
        # Display results
        print(f"\n{'RESULTS':^40}")
        print("-" * 40)
        print(f"Temperature change: {current_temp}°F → {target_temp}°F")
        print(f"House size: {square_footage:,.0f} sq ft")
        print(f"HVAC units: {num_units}")
        print(f"Outdoor temp: {outdoor_temp}°F")
        print(f"Time needed: {minutes} minutes ({minutes/60:.1f} hours)")
        
        # Energy saving tip
        if minutes > 60:
            print(f"\n💡 TIP: Consider starting your system {minutes} minutes")
            print("   before you arrive home to save energy!")
        
    except ValueError:
        print("Please enter valid numbers!")
    except KeyboardInterrupt:
        print("\nGoodbye!")

if __name__ == "__main__":
    # Run the demo first
    run_demo()
    
    # Then run interactive mode
    user_input_example()
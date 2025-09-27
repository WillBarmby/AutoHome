import requests
from typing import Optional

class SmartThermostat:
    def __init__(self):
        """Initialize the smart thermostat"""
        pass
    
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
    
    test_cities = ["New York", "Los Angeles", "Chicago", "Miami", "Seattle"]
    thermostat = SmartThermostat()
    
    for city in test_cities:
        print(f"\n🌍 Testing {city}...")
        temp = thermostat.get_outdoor_temperature(city=city)
        if temp:
            print(f"✅ Temperature: {temp}°F")
        else:
            print("❌ Failed to get temperature")

if __name__ == "__main__":
    print("Smart Thermostat Calculator")
    print("=" * 30)
    print("Choose an option:")
    print("1. Quick Calculator (uses defaults)")
    print("2. Full Input Demo (specify all details)")
    print("3. Test API")
    
    try:
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            quick_calculator()
        elif choice == "2":
            full_input_demo()
        elif choice == "3":
            test_api()
        else:
            print("Running quick calculator...")
            quick_calculator()
            
    except KeyboardInterrupt:
        print("\nGoodbye!")
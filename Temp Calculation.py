"""
Enhanced Smart Thermostat Optimization System
Hackathon Project - Sustainability Focus

Enhanced with:
- Sleep/wake routine optimization
- Automatic blind control integration
- Sunlight impact calculation
- Open door airflow considerations
"""

import math
import datetime
from typing import Tuple, Dict, Any, List
from enum import Enum

class RoutineState(Enum):
    AWAKE = "awake"
    BEDTIME = "bedtime"
    SLEEPING = "sleeping"
    WAKING_UP = "waking_up"

class BlindPosition(Enum):
    OPEN = 1.0
    PARTIALLY_OPEN = 0.5
    CLOSED = 0.0

class EnhancedSmartThermostat:
    """
    Enhanced smart thermostat optimizer with routine, blinds, sunlight, and door factors
    """
    
    def __init__(self):
        self.base_temp = 72  # Standard comfortable temperature (°F)
        self.min_temp = 68   # Minimum allowed temperature
        self.max_temp = 82   # Maximum allowed temperature
        self.max_temp_change = 2  # Maximum temperature change per adjustment
        
        # Sleep routine temperatures
        self.bedtime_temp = 68  # Cooler for better sleep
        self.sleep_temp = 66    # Even cooler during deep sleep
        self.wake_temp = 70     # Slightly warmer for waking up
        
    def determine_routine_state(self,
                                current_hour: int, 
                                occupancy_count: int) -> RoutineState:
        """Determine current routine state based on time and occupancy"""
        if occupancy_count == 0:
            return RoutineState.AWAKE
            
        if 22 <= current_hour or current_hour <= 2:  # 10 PM - 2 AM
            return RoutineState.BEDTIME
        elif 3 <= current_hour <= 6:  # 3 AM - 6 AM
            return RoutineState.SLEEPING
        elif 7 <= current_hour <= 8:  # 7 AM - 8 AM
            return RoutineState.WAKING_UP
        else:
            return RoutineState.AWAKE

    def calculate_sunlight_impact(self, 
                                  outside_temp: float, 
                                  current_hour: int, 
                                  blinds_position: BlindPosition = BlindPosition.OPEN) -> Dict[str, Any]:
        """Calculate sunlight heat gain and optimal blind position"""
        
        # Calculate sun intensity based on time of day (simplified)
        if 6 <= current_hour <= 18:  # Daylight hours
            # Peak sun at noon, reduces toward morning/evening
            sun_angle_factor = math.sin(math.pi * (current_hour - 6) / 12)
            sun_intensity = max(0, sun_angle_factor)
        else:
            sun_intensity = 0
        
        # Calculate heat gain from sunlight
        base_sunlight_heat_gain = sun_intensity * 8  # Up to 8°F heat gain
        actual_heat_gain = base_sunlight_heat_gain * blinds_position.value
        
        # Determine optimal blind position
        if outside_temp > 80 and sun_intensity > 0.5:  # Hot and sunny
            optimal_blinds = BlindPosition.CLOSED
            blind_adjustment = "Close blinds to reduce heat gain"
        elif outside_temp > 75 and sun_intensity > 0.7:  # Warm and very sunny
            optimal_blinds = BlindPosition.PARTIALLY_OPEN
            blind_adjustment = "Partially close blinds"
        elif outside_temp < 65 and sun_intensity > 0.3:  # Cool but sunny
            optimal_blinds = BlindPosition.OPEN
            blind_adjustment = "Keep blinds open for natural heating"
        else:
            optimal_blinds = BlindPosition.OPEN
            blind_adjustment = "Keep blinds open"
            
        return {
            'heat_gain': actual_heat_gain,
            'optimal_blinds': optimal_blinds,
            'blind_adjustment': blind_adjustment,
            'sun_intensity': sun_intensity
        }

    def calculate_door_airflow_effect(self, 
                                      doors_open_count: int, 
                                      total_doors: int, 
                                      outside_temp: float, 
                                      inside_temp: float) -> float:
        """Calculate temperature adjustment based on open doors"""
        if doors_open_count == 0:
            return 0
            
        # Calculate percentage of doors open
        door_open_ratio = min(doors_open_count / total_doors, 1.0)
        
        # Temperature differential between inside and outside
        temp_differential = outside_temp - inside_temp
        
        # Open doors cause temperature to drift toward outside temperature
        # More open doors = more effect
        door_effect = temp_differential * door_open_ratio * 0.3  # Up to 30% of differential
        
        return door_effect

    def calculate_enhanced_optimal_temperature(self, 
                                               humidity_percent: float, 
                                               outside_temp_f: float, 
                                               occupancy_count: int, 
                                               current_temp_f: float,
                                               current_hour: int = None, 
                                               doors_open: int = 0, 
                                               total_doors: int = 10, 
                                               blinds_position: BlindPosition = BlindPosition.OPEN) -> Dict[str, Any]:
        """
        Enhanced optimal temperature calculation with all new factors
        """
        
        if current_hour is None:
            current_hour = datetime.datetime.now().hour
            
        # 1. ROUTINE STATE ADJUSTMENT
        routine_state = self.determine_routine_state(current_hour, occupancy_count)
        
        if routine_state == RoutineState.BEDTIME:
            base_target = self.bedtime_temp
            routine_adjustment = -4  # Cooler for bedtime
        elif routine_state == RoutineState.SLEEPING:
            base_target = self.sleep_temp
            routine_adjustment = -6  # Coolest for deep sleep
        elif routine_state == RoutineState.WAKING_UP:
            base_target = self.wake_temp
            routine_adjustment = -2  # Slightly cooler but warming up
        else:
            base_target = self.base_temp
            routine_adjustment = 0
        
        # 2. OCCUPANCY ADJUSTMENT
        occupancy_adjustment = min(occupancy_count * 1.5, 6)
        
        # 3. HUMIDITY ADJUSTMENT
        if humidity_percent > 50:
            humidity_adjustment = (humidity_percent - 50) * 0.15
        else:
            humidity_adjustment = 0
        
        # 4. SUNLIGHT AND BLINDS ADJUSTMENT
        sunlight_data = self.calculate_sunlight_impact(outside_temp_f, current_hour, blinds_position)
        sunlight_heat_gain = sunlight_data['heat_gain']
        
        # Reduce target temperature if getting heat from sunlight
        sunlight_adjustment = -sunlight_heat_gain * 0.5  # Counter half the heat gain
        
        # 5. DOOR AIRFLOW ADJUSTMENT
        door_effect = self.calculate_door_airflow_effect(doors_open, total_doors, outside_temp_f, current_temp_f)
        # Compensate for door effect
        door_adjustment = -door_effect * 0.8  # Counter most of the door effect
        
        # 6. OUTSIDE TEMPERATURE INFLUENCE
        if outside_temp_f > 80:
            outside_adjustment = min((outside_temp_f - 80) * 0.3, 8)
        elif outside_temp_f < 60:
            outside_adjustment = -min((60 - outside_temp_f) * 0.2, 5)
        else:
            outside_adjustment = 0
        
        # 7. CALCULATE OPTIMAL TEMPERATURE
        optimal_temp = base_target + (
            occupancy_adjustment + 
            humidity_adjustment + 
            sunlight_adjustment +
            door_adjustment +
            outside_adjustment
        )
        
        # Apply bounds
        optimal_temp = max(self.min_temp, min(self.max_temp, optimal_temp))
        
        # Smooth transition
        if abs(optimal_temp - current_temp_f) > self.max_temp_change:
            if optimal_temp > current_temp_f:
                optimal_temp = current_temp_f + self.max_temp_change
            else:
                optimal_temp = current_temp_f - self.max_temp_change
        
        return {
            'optimal_temperature': round(optimal_temp, 1),
            'routine_state': routine_state.value,
            'routine_adjustment': routine_adjustment,
            'sunlight_data': sunlight_data,
            'door_effect': round(door_effect, 1),
            'adjustments': {
                'occupancy': round(occupancy_adjustment, 1),
                'humidity': round(humidity_adjustment, 1),
                'sunlight': round(sunlight_adjustment, 1),
                'doors': round(door_adjustment, 1),
                'outside_temp': round(outside_adjustment, 1)
            },
            'energy_savings_estimate': self.calculate_enhanced_energy_savings(optimal_temp, self.base_temp, outside_temp_f)
        }

    def calculate_enhanced_energy_savings(self, 
                                          optimal_temp: float, 
                                          baseline_temp: float, 
                                          outside_temp: float) -> Dict[str, float]:
        """Calculate energy savings with enhanced factors"""
        baseline_differential = abs(baseline_temp - outside_temp)
        optimized_differential = abs(optimal_temp - outside_temp)
        
        if baseline_differential == 0:
            return {'percentage': 0, 'kwh_saved_estimate': 0}
            
        savings_percent = ((baseline_differential - optimized_differential) / baseline_differential) * 100
        savings_percent = max(0, savings_percent)
        
        # Estimate kWh savings (rough calculation)
        kwh_saved = savings_percent * 0.15  # Approximate kWh per hour per % savings
        
        return {
            'percentage': round(savings_percent, 1),
            'kwh_saved_estimate': round(kwh_saved, 2)
        }

    def get_smart_home_recommendations(self,
                                       humidity: float, 
                                       outside_temp: float, 
                                       occupancy: int, 
                                       current_temp: float,
                                       current_hour: int, 
                                       doors_open: int = 0,
                                       total_doors: int = 10,
                                       blinds_position: BlindPosition = BlindPosition.OPEN) -> Dict[str, Any]:
        """
        Get complete smart home automation recommendations
        """
        
        result = self.calculate_enhanced_optimal_temperature(
            humidity, outside_temp, occupancy, current_temp,
            current_hour, doors_open, total_doors, blinds_position
        )
        
        # Add automation recommendations
        recommendations = []
        
        # Blind recommendations
        optimal_blinds = result['sunlight_data']['optimal_blinds']
        if optimal_blinds != blinds_position:
            recommendations.append(f"🪟 {result['sunlight_data']['blind_adjustment']}")
        
        # Door recommendations
        if doors_open > 3 and abs(outside_temp - current_temp) > 10:
            recommendations.append("🚪 Consider closing some doors to improve temperature control")
        
        # Routine recommendations
        routine_state = result['routine_state']
        if routine_state in ['bedtime', 'sleeping']:
            recommendations.append("😴 Sleep mode: Temperature optimized for better rest")
        elif routine_state == 'waking_up':
            recommendations.append("☀️ Wake mode: Gradually warming for comfort")
        
        result['automation_recommendations'] = recommendations
        
        return result


def main():
    """
    Enhanced example usage and testing
    """
    thermostat = EnhancedSmartThermostat()
    
    # Test scenarios with new factors
    test_scenarios = [
        {
            'name': 'Morning Wake Up - Sunny Day',
            'humidity': 45,
            'outside_temp': 75,
            'occupancy': 2,
            'current_temp': 68,
            'current_hour': 7,
            'doors_open': 1,
            'total_doors': 8,
            'blinds_position': BlindPosition.OPEN
        },
        {
            'name': 'Bedtime - Cool Evening',
            'humidity': 50,
            'outside_temp': 65,
            'occupancy': 2,
            'current_temp': 72,
            'current_hour': 22,
            'doors_open': 0,
            'total_doors': 8,
            'blinds_position': BlindPosition.CLOSED
        },
        {
            'name': 'Hot Sunny Afternoon - Windows/Doors Open',
            'humidity': 60,
            'outside_temp': 95,
            'occupancy': 3,
            'current_temp': 76,
            'current_hour': 14,
            'doors_open': 4,
            'total_doors': 8,
            'blinds_position': BlindPosition.OPEN
        },
        {
            'name': 'Deep Sleep - Middle of Night',
            'humidity': 40,
            'outside_temp': 70,
            'occupancy': 2,
            'current_temp': 70,
            'current_hour': 4,
            'doors_open': 0,
            'total_doors': 8,
            'blinds_position': BlindPosition.CLOSED
        }
    ]
    
    print("🏠 Enhanced Smart Thermostat System")
    print("=" * 50)
    
    for scenario in test_scenarios:
        print(f"\n📊 Scenario: {scenario['name']}")
        print("-" * 40)
        
        result = thermostat.get_smart_home_recommendations(
            scenario['humidity'],
            scenario['outside_temp'],
            scenario['occupancy'],
            scenario['current_temp'],
            scenario['current_hour'],
            scenario['doors_open'],
            scenario['total_doors'],
            scenario['blinds_position']
        )
        
        print(f"🌡️  Current Temperature: {scenario['current_temp']}°F")
        print(f"🎯 Optimal Temperature: {result['optimal_temperature']}°F")
        print(f"🛏️  Routine State: {result['routine_state'].title()}")
        print(f"☀️  Sun Intensity: {result['sunlight_data']['sun_intensity']:.1%}")
        print(f"🪟 Blind Recommendation: {result['sunlight_data']['blind_adjustment']}")
        print(f"🚪 Doors Open: {scenario['doors_open']}/{scenario['total_doors']}")
        print(f"💡 Door Effect: {result['door_effect']}°F")
        
        # Show detailed adjustments
        print("\n📈 Temperature Adjustments:")
        for factor, adjustment in result['adjustments'].items():
            if adjustment != 0:
                print(f"   • {factor.title()}: {adjustment:+.1f}°F")
        
        # Energy savings
        savings = result['energy_savings_estimate']
        print(f"\n💚 Energy Savings: {savings['percentage']}% ({savings['kwh_saved_estimate']} kWh/hour)")
        
        # Automation recommendations
        if result['automation_recommendations']:
            print("\n🤖 Smart Home Actions:")
            for rec in result['automation_recommendations']:
                print(f"   • {rec}")


# Example usage for your hackathon integration
def hackathon_integration_example():
    """
    Example of how to integrate with your hackathon project
    """
    thermostat = EnhancedSmartThermostat()
    
    # Simulate data from your sensors
    current_conditions = {
        'humidity': 55,           # From thermostat sensor
        'outside_temp': 88,       # From weather API
        'occupancy': 3,           # From Find My iPhone
        'current_temp': 74,       # From thermostat
        'current_hour': 15,       # 3 PM
        'doors_open': 2,          # From door sensors
        'total_doors': 8,         # Your house configuration
        'blinds_position': BlindPosition.OPEN  # From smart blind sensors
    }
    
    # Get optimization recommendations
    recommendations = thermostat.get_smart_home_recommendations(**current_conditions)
    
    # What you'd send to your thermostat
    target_temp = recommendations['optimal_temperature']
    
    # What you'd send to your smart home devices
    automation_actions = recommendations['automation_recommendations']
    
    print(f"🎯 Set thermostat to: {target_temp}°F")
    print(f"🤖 Automation actions: {automation_actions}")
    
    return target_temp, automation_actions


if __name__ == "__main__":
    main()
    print("\n" + "="*50)
    print("🚀 Hackathon Integration Example:")
    print("-" * 30)
    hackathon_integration_example()
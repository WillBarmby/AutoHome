import math

def calculate_optimal_temperature(humidity_percent, outside_temp_f, occupancy_count, current_temp_f):
    """
    Calculate optimal thermostat temperature for energy efficiency and comfort
    
    Args:
        humidity_percent: Indoor humidity (0-100)
        outside_temp_f: Outside temperature in Fahrenheit
        occupancy_count: Number of people in the home
        current_temp_f: Current indoor temperature
    
    Returns:
        optimal_temp_f: Recommended thermostat setting
    """
    
    # Base comfortable temperature
    base_temp = 72  # Standard comfortable temperature
    
    # 1. OCCUPANCY ADJUSTMENT
    # Each person adds ~2°F of heat, so we can raise target temp slightly
    occupancy_adjustment = min(occupancy_count * 1.5, 6)  # Cap at 6°F max
    
    # 2. HUMIDITY ADJUSTMENT  
    # Higher humidity feels warmer, so we can set temp higher
    # Optimal humidity is 30-50%, above 50% feels warmer
    if humidity_percent > 50:
        humidity_adjustment = (humidity_percent - 50) * 0.15  # Up to 7.5°F at 100% humidity
    else:
        humidity_adjustment = 0
    
    # 3. OUTSIDE TEMPERATURE INFLUENCE
    # Minimize energy by not fighting outside temp too much
    temp_differential = abs(outside_temp_f - base_temp)
    
    if outside_temp_f > 80:  # Hot outside - cooling mode
        # Allow slightly warmer indoor temp when it's very hot outside
        outside_adjustment = min((outside_temp_f - 80) * 0.3, 8)
    elif outside_temp_f < 60:  # Cold outside - heating mode  
        # Allow slightly cooler indoor temp when it's very cold outside
        outside_adjustment = -min((60 - outside_temp_f) * 0.2, 5)
    else:
        outside_adjustment = 0
    
    # 4. ENERGY EFFICIENCY FACTOR
    # Gradually adjust toward target to avoid sudden energy spikes
    current_diff = abs(current_temp_f - base_temp)
    if current_diff > 5:
        # If we're far from base temp, move more conservatively
        efficiency_factor = 0.7
    else:
        efficiency_factor = 1.0
    
    # Calculate optimal temperature
    optimal_temp = base_temp + (
        occupancy_adjustment + 
        humidity_adjustment + 
        outside_adjustment
    ) * efficiency_factor
    
    # Apply reasonable bounds (68-82°F)
    optimal_temp = max(68, min(82, optimal_temp))
    
    # Smooth transition: don't change more than 2°F at once
    max_change = 2
    if abs(optimal_temp - current_temp_f) > max_change:
        if optimal_temp > current_temp_f:
            optimal_temp = current_temp_f + max_change
        else:
            optimal_temp = current_temp_f - max_change
    
    return round(optimal_temp, 1)

def enhanced_optimization(humidity, outside_temp, occupancy, current_temp, time_of_day, season):
    """
    Enhanced version with time and seasonal considerations
    """
    base_optimal = calculate_optimal_temperature(humidity, outside_temp, occupancy, current_temp)
    
    # Time-based adjustments
    if 22 <= time_of_day or time_of_day <= 6:  # Night time (10 PM - 6 AM)
        base_optimal += 2  # Warmer at night for sleep comfort
    
    # Seasonal adjustments
    seasonal_factor = {
        'winter': -1,  # Slightly cooler in winter
        'summer': 1,   # Slightly warmer in summer
        'spring': 0,
        'fall': 0
    }
    
    final_temp = base_optimal + seasonal_factor.get(season, 0)
    return max(68, min(82, final_temp))

# Energy savings calculation
def calculate_energy_savings(optimal_temp, current_setting, outside_temp):
    """
    Estimate energy savings percentage
    """
    baseline_differential = abs(current_setting - outside_temp)
    optimized_differential = abs(optimal_temp - outside_temp)
    
    savings_percent = ((baseline_differential - optimized_differential) / baseline_differential) * 100
    return max(0, savings_percent)


# Example usage
humidity = 55  # 55% humidity
outside_temp = 95  # 95°F outside (hot summer day)
occupancy = 3  # 3 people home
current_temp = 72  # Currently set to 72°F

optimal_temp = calculate_optimal_temperature(humidity, outside_temp, occupancy, current_temp)
energy_savings = calculate_energy_savings(optimal_temp, 72, outside_temp)

print(f"Recommended temperature: {optimal_temp}°F")
print(f"Estimated energy savings: {energy_savings:.1f}%")
def execute_command(cmd: dict):
    device = cmd.get("device")
    action = cmd.get("action")
    value = cmd.get("value")

    if device == "thermostat":
        if action == "set":
            print(f"🌡️ Setting thermostat to {value}°")
        elif action == "increase":
            print("🌡️ Increasing thermostat")
        elif action == "decrease":
            print("🌡️ Decreasing thermostat")
    elif device == "fan":
        if action == "on":
            print("🌀 Turning fan on")
        elif action == "off":
            print("🌀 Turning fan off")
    elif device == "lights":
        if action == "on":
            print("💡 Lights on")
        elif action == "off":
            print("💡 Lights off")
    else:
        print(f"⚠️ Unknown device/action: {cmd}")

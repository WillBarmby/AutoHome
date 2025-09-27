import subprocess
import json

def parse_command(command: str):
    result = subprocess.run(
        ["ollama", "run", "smartparser", command],
        capture_output=True,
        text=True
    )
    output = result.stdout.strip()
    
    try:
        parsed = json.loads(output)
        for cmd in parsed:
            if "value" in cmd:
                try:
                    cmd["value"] = int(cmd["value"])
                except (ValueError, TypeError):
                    pass
        if isinstance(parsed, dict):
            return [parsed]
        elif isinstance(parsed, list):
            return parsed
        else:
            print("⚠️ Unexpected type:", type(parsed))
            return []
    except json.JSONDecodeError:
        print("⚠️ Invalid JSON:", output)
        return []

# Example
cmd = "set thermostat to 70 and turn off the fan"
parsed = parse_command(cmd)
print(parsed)

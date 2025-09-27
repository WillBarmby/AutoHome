import subprocess
import json
from locations import LocationRegistry

registry = LocationRegistry()

def parse_command(command: str):
    """
    Parse a natural language command using the Mistral model (via Ollama),
    validate/normalize the JSON output, and enrich it with location info.
    """
    result = subprocess.run(
        ["ollama", "run", "smartparser", command],
        capture_output=True,
        text=True
    )
    output = result.stdout.strip()

    try:
        parsed = json.loads(output)

        # Ensure everything is wrapped in a list for consistency
        commands = parsed if isinstance(parsed, list) else [parsed]

        validated = []
        for cmd in commands:
            device = cmd.get("device")
            action = cmd.get("action")
            location = cmd.get("location")
            value = cmd.get("value")

            # Normalize value → int if possible
            if value is not None:
                try:
                    cmd["value"] = int(value)
                except (ValueError, TypeError):
                    pass  # leave as-is if not an int

            # Validate required fields
            if not device or not action:
                print(f"⚠️ Skipping incomplete command: {cmd}")
                continue

            # Validate location if provided
                        # Validate location if provided
            if location:
                if location not in registry.mapping:
                    print(f"⚠️ Unknown location '{location}', skipping command: {cmd}")
                    continue
            else:
                # No location specified → assume housewide call
                cmd["location"] = None


            validated.append(cmd)

        return validated

    except json.JSONDecodeError:
        print("⚠️ Invalid JSON from model:", output)
        return []

# Example usage
if __name__ == "__main__":
    cmd = "set thermostat to 70 and turn off the fan in the living room"
    parsed = parse_command(cmd)
    print(parsed)

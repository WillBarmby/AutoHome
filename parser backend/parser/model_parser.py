import subprocess
import json
from config import MISTRAL_JSON_COMMAND as command_intro
def parse_command(command: str):
    result = subprocess.run(
        ["ollama", "run", "smartparser", command],
        capture_output=True,
        text=True
    )
    output = result.stdout.strip()
    try:
        # Parse JSON into Python dict
        return json.loads(output)
    except json.JSONDecodeError:
        print("Model output was not valid JSON:", output)
        return None

# Example usage
cmd = command_intro + "set thermostat to 70 and turn off the fan"
parsed = parse_command(cmd)
print(parsed)

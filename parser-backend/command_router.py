import subprocess
import json
import requests
from locations import LocationRegistry

BASE_URL = "http://localhost:8123/api"
TOKEN = "YOUR_LONG_LIVED_ACCESS_TOKEN"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

class CommandRouter:
    def __init__(self, model="smartparser"):
        self.model = model
        self.registry = LocationRegistry()
        self.mapping = {
            ("light", "turn_on"): ("light", "turn_on"),
            ("light", "turn_off"): ("light", "turn_off"),
            ("thermostat", "set_temperature"): ("climate", "set_temperature"),
            ("fan", "turn_on"): ("fan", "turn_on"),
            ("fan", "turn_off"): ("fan", "turn_off"),
            ("coffee", "turn_on"): ("switch", "turn_on"),
            ("coffee", "turn_off"): ("switch", "turn_off"),
        }

    # ---------- Parsing ----------
    def parse(self, command: str):
        result = subprocess.run(
            ["ollama", "run", self.model, command],
            capture_output=True,
            text=True
        )
        output = result.stdout.strip()
        try:
            parsed = json.loads(output)
            commands = parsed if isinstance(parsed, list) else [parsed]

            cleaned = []
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
                        pass

                if not device or not action:
                    continue

                # If location invalid, skip; if None, treat as housewide
                if location and location not in self.registry.mapping:
                    continue
                cmd["location"] = location if location else None

                cleaned.append(cmd)

            return cleaned
        except json.JSONDecodeError:
            print("⚠️ Invalid JSON from model:", output)
            return []

    # ---------- Execution ----------
    def execute(self, cmd: dict):
        device = cmd["device"]
        action = cmd["action"]
        location = cmd.get("location")
        value = cmd.get("value")

        key = (device, action)
        if key not in self.mapping:
            raise ValueError(f"No mapping for {key}")
        domain, service = self.mapping[key]

        payload = {}
        if location:
            entity_id = self.registry.get_entity_id(location, device)
            if not entity_id:
                raise ValueError(f"No entity ID for {device} in {location}")
            payload["entity_id"] = entity_id
        # else: housewide → no entity_id → affects all devices of that domain

        if value is not None:
            payload["temperature"] = value

        url = f"{BASE_URL}/services/{domain}/{service}"
        r = requests.post(url, headers=HEADERS, json=payload)
        return r.status_code, r.text

import json
from pathlib import Path

class LocationRegistry:
    def __init__(self, path="locations.json"):
        self.path = Path(path)
        with open(self.path, "r") as f:
            self.mapping = json.load(f)

    def get_entity_id(self, location, device):
        """Return the entity_id for a device in a location, or None if not found."""
        try:
            return self.mapping[location][device]
        except KeyError:
            return None

    def add_location(self, location, devices):
        """devices should be a dict: {'light': 'light.new_room_light'}"""
        self.mapping[location] = devices
        self._save()

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self.mapping, f, indent=2)

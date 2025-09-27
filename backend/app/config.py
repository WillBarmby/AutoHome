from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
STATE_DIR = BACKEND_DIR / "state"

DEVICES_PATH = STATE_DIR / "devices.json"
PREFERENCES_PATH = STATE_DIR / "preferences.json"
COMMANDS_PATH = STATE_DIR / "commands.json"

MOCK_HA = os.getenv("MOCK_HA", "true").lower() != "false"
HA_BASE_URL = os.getenv("HA_BASE_URL")
HA_TOKEN = os.getenv("HA_TOKEN")


__all__ = [
    "BACKEND_DIR",
    "STATE_DIR",
    "DEVICES_PATH",
    "PREFERENCES_PATH",
    "COMMANDS_PATH",
    "MOCK_HA",
    "HA_BASE_URL",
    "HA_TOKEN",
]

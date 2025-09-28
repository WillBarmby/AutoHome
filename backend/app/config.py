from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
STATE_DIR = BACKEND_DIR / "state"

DEVICES_PATH = STATE_DIR / "devices.json"
PREFERENCES_PATH = STATE_DIR / "preferences.json"
COMMANDS_PATH = STATE_DIR / "commands.json"
DASHBOARD_PATH = STATE_DIR / "dashboard.json"
SCHEDULE_PATH = STATE_DIR / "schedule.json"

MOCK_HA = os.getenv("MOCK_HA", "true").lower() != "false"
HA_BASE_URL = os.getenv("HA_BASE_URL")
HA_TOKEN = os.getenv("HA_TOKEN")
THERMOSTAT_ENTITY_ID = os.getenv("THERMOSTAT_ENTITY_ID", "climate.home")
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "San Francisco")
HOME_SQUARE_FOOTAGE = float(os.getenv("HOME_SQUARE_FOOTAGE", "2200"))
HOME_COOLING_UNITS = int(os.getenv("HOME_COOLING_UNITS", "1"))


__all__ = [
    "BACKEND_DIR",
    "STATE_DIR",
    "DEVICES_PATH",
    "PREFERENCES_PATH",
    "COMMANDS_PATH",
    "DASHBOARD_PATH",
    "SCHEDULE_PATH",
    "MOCK_HA",
    "HA_BASE_URL",
    "HA_TOKEN",
    "THERMOSTAT_ENTITY_ID",
    "DEFAULT_CITY",
    "HOME_SQUARE_FOOTAGE",
    "HOME_COOLING_UNITS",
]

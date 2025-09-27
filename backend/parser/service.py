"""Parser service that converts natural language into structured commands."""

from __future__ import annotations

import re
from typing import Dict, Optional

from pydantic import BaseModel

from backend.db import Command


class ParsedIntent(BaseModel):
    """Structured result representing the user's intent."""

    device_id: str
    action: str
    parameters: Dict[str, str]


class CommandParser:
    """Very small rule-based parser used until an LLM is integrated."""

    _LIGHT_ACTIONS = {"turn on": "turn_on", "turn off": "turn_off", "dim": "set_brightness"}
    _THERMOSTAT_PATTERN = re.compile(r"set (?:the )?thermostat to (?P<temperature>\d{2})", re.I)

    def parse(self, utterance: str) -> Optional[ParsedIntent]:
        """Parse an utterance into a structured command."""

        text = utterance.strip().lower()
        if not text:
            return None

        if "living room" in text and any(action in text for action in self._LIGHT_ACTIONS):
            for human_action, canonical in self._LIGHT_ACTIONS.items():
                if human_action in text:
                    parameters: Dict[str, str] = {}
                    brightness_match = re.search(r"(\d{1,3})%", text)
                    if canonical == "set_brightness" and brightness_match:
                        parameters["brightness"] = brightness_match.group(1)
                    return ParsedIntent(
                        device_id="living-room-light",
                        action=canonical,
                        parameters=parameters,
                    )

        thermostat_match = self._THERMOSTAT_PATTERN.search(text)
        if thermostat_match:
            return ParsedIntent(
                device_id="hallway-thermostat",
                action="set_temperature",
                parameters={"temperature": thermostat_match.group("temperature")},
            )

        if "office" in text and "switch" in text:
            if "turn on" in text:
                return ParsedIntent(device_id="office-switch", action="turn_on", parameters={})
            if "turn off" in text:
                return ParsedIntent(device_id="office-switch", action="turn_off", parameters={})

        return None

    def to_command(self, intent: ParsedIntent) -> Command:
        """Convert a parsed intent into a command model."""

        return Command(device_id=intent.device_id, action=intent.action, parameters=intent.parameters)


__all__ = ["CommandParser", "ParsedIntent"]

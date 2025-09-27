from pydantic import BaseModel
from typing import Optional

class Command(BaseModel):
    device: str           # "thermostat", "lights"
    action: str           # "set", "turn_on", "turn_off"
    value: Optional[int]  # e.g. 68 (degrees)
    time: Optional[str]   # e.g. "21:00"

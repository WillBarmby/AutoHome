"""
SmartHome Light Management System
Handles light control commands parsed from LLM user input
"""

import json
import logging
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LightState(Enum):
    ON = "on"
    OFF = "off"

class Room(Enum):
    LIVING_ROOM = "living_room"
    BEDROOM = "bedroom"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    DINING_ROOM = "dining_room"
    OFFICE = "office"
    GARAGE = "garage"
    HALLWAY = "hallway"
    ALL = "all"
    NONE = "none"

class SmartHomeLightManager:
    def __init__(self):
        """Initialize the Smart Home Light Manager"""
        # Initialize all lights as OFF
        self.lights = {
            Room.LIVING_ROOM: LightState.OFF,
            Room.BEDROOM: LightState.OFF,
            Room.KITCHEN: LightState.OFF,
            Room.BATHROOM: LightState.OFF,
            Room.DINING_ROOM: LightState.OFF,
            Room.OFFICE: LightState.OFF,
            Room.GARAGE: LightState.OFF,
            Room.HALLWAY: LightState.OFF,
        }
        
        # Room aliases for better user experience
        self.room_aliases = {
            "living room": Room.LIVING_ROOM,
            "livingroom": Room.LIVING_ROOM,
            "lounge": Room.LIVING_ROOM,
            "bed room": Room.BEDROOM,
            "master bedroom": Room.BEDROOM,
            "bath room": Room.BATHROOM,
            "bath": Room.BATHROOM,
            "dining room": Room.DINING_ROOM,
            "diningroom": Room.DINING_ROOM,
            "study": Room.OFFICE,
            "home office": Room.OFFICE,
            "hall": Room.HALLWAY,
            "corridor": Room.HALLWAY,
            "everywhere": Room.ALL,
            "every room": Room.ALL,
            "entire house": Room.ALL,
            "whole house": Room.ALL,
            "nowhere": Room.NONE,
            "no room": Room.NONE,
        }
        
        logger.info("🏠 SmartHome Light Manager initialized successfully")

    def _normalize_room(self, room: str) -> Optional[Room]:
        """Normalize room input to Room enum"""
        room_lower = room.lower().strip()
        
        # Check direct enum values
        for room_enum in Room:
            if room_lower == room_enum.value:
                return room_enum
        
        # Check aliases
        if room_lower in self.room_aliases:
            return self.room_aliases[room_lower]
        
        return None

    def _normalize_state(self, state: str) -> Optional[LightState]:
        """Normalize state input to LightState enum"""
        state_lower = state.lower().strip()
        
        # ON states
        if state_lower in ["on", "turn on", "switch on", "enable", "activate", "1", "true"]:
            return LightState.ON
        
        # OFF states
        if state_lower in ["off", "turn off", "switch off", "disable", "deactivate", "0", "false"]:
            return LightState.OFF
        
        return None

    def _format_room_name(self, room: Room) -> str:
        """Format room name for display"""
        return room.value.replace('_', ' ').title()

    def control_lights(self, room: str, state: str) -> Dict:
        """
        Main function to control lights based on room and state parameters
        
        Args:
            room (str): The room to control lights in
            state (str): The desired state (on/off)
        
        Returns:
            Dict: Response with status and details
        """
        try:
            # Normalize inputs
            normalized_room = self._normalize_room(room)
            normalized_state = self._normalize_state(state)
            
            # Validate inputs
            if normalized_room is None:
                available_rooms = [self._format_room_name(r) for r in Room if r not in [Room.ALL, Room.NONE]]
                return {
                    "status": "❌ ERROR",
                    "message": f"Unknown room '{room}'",
                    "suggestion": f"Available rooms: {', '.join(available_rooms)}",
                    "success": False,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            
            if normalized_state is None:
                return {
                    "status": "❌ ERROR",
                    "message": f"Invalid state '{state}'",
                    "suggestion": "Use 'on' or 'off'",
                    "success": False,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            
            # Handle special cases
            if normalized_room == Room.ALL:
                return self._control_all_lights(normalized_state)
            elif normalized_room == Room.NONE:
                return self._turn_off_all_lights()
            else:
                return self._control_single_room(normalized_room, normalized_state)
                
        except Exception as e:
            logger.error(f"Error in control_lights: {str(e)}")
            return {
                "status": "❌ SYSTEM ERROR",
                "message": f"Internal error occurred",
                "error_details": str(e),
                "success": False,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def _control_single_room(self, room: Room, state: LightState) -> Dict:
        """Control lights in a single room"""
        old_state = self.lights[room]
        self.lights[room] = state
        
        room_name = self._format_room_name(room)
        state_emoji = "💡" if state == LightState.ON else "🔌"
        action = "turned on" if state == LightState.ON else "turned off"
        
        if old_state == state:
            logger.info(f"Lights in {room_name} were already {state.value}")
            return {
                "status": f"ℹ️  NO CHANGE",
                "message": f"{room_name} lights were already {state.value}",
                "room": room_name,
                "current_state": f"{state_emoji} {state.value.upper()}",
                "success": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        
        logger.info(f"Lights in {room_name} {action}")
        
        return {
            "status": "✅ SUCCESS",
            "message": f"{room_name} lights {action}",
            "room": room_name,
            "previous_state": f"{'💡' if old_state == LightState.ON else '🔌'} {old_state.value.upper()}",
            "current_state": f"{state_emoji} {state.value.upper()}",
            "success": True,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _control_all_lights(self, state: LightState) -> Dict:
        """Control all lights in the house"""
        changed_rooms = []
        unchanged_rooms = []
        
        for room in self.lights:
            old_state = self.lights[room]
            room_name = self._format_room_name(room)
            
            if old_state != state:
                self.lights[room] = state
                changed_rooms.append(room_name)
            else:
                unchanged_rooms.append(room_name)
        
        state_emoji = "💡" if state == LightState.ON else "🔌"
        action = "turned on" if state == LightState.ON else "turned off"
        
        logger.info(f"All lights {action} - {len(changed_rooms)} rooms affected")
        
        response = {
            "status": "✅ SUCCESS",
            "message": f"All lights {action}",
            "current_state": f"{state_emoji} ALL {state.value.upper()}",
            "total_rooms": len(self.lights),
            "success": True,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if changed_rooms:
            response["changed_rooms"] = changed_rooms
        if unchanged_rooms:
            response["already_correct"] = unchanged_rooms
            
        return response

    def _turn_off_all_lights(self) -> Dict:
        """Turn off all lights (special case for 'none')"""
        result = self._control_all_lights(LightState.OFF)
        result["message"] = "All lights turned off (none command)"
        return result

    def get_light_status(self, room: Optional[str] = None) -> Dict:
        """Get current status of lights"""
        if room is None:
            # Return status of all lights
            lights_on = []
            lights_off = []
            
            for room_enum, state in self.lights.items():
                room_name = self._format_room_name(room_enum)
                if state == LightState.ON:
                    lights_on.append(f"💡 {room_name}")
                else:
                    lights_off.append(f"🔌 {room_name}")
            
            total_on = len(lights_on)
            total_rooms = len(self.lights)
            
            return {
                "status": "📊 STATUS REPORT",
                "summary": f"{total_on}/{total_rooms} rooms have lights on",
                "lights_on": lights_on if lights_on else ["None"],
                "lights_off": lights_off if lights_off else ["None"],
                "success": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        else:
            # Return status of specific room
            normalized_room = self._normalize_room(room)
            if normalized_room is None or normalized_room in [Room.ALL, Room.NONE]:
                return {
                    "status": "❌ ERROR",
                    "message": f"Invalid room for status check: '{room}'",
                    "success": False,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            
            room_name = self._format_room_name(normalized_room)
            state = self.lights[normalized_room]
            state_emoji = "💡" if state == LightState.ON else "🔌"
            
            return {
                "status": "📊 ROOM STATUS",
                "room": room_name,
                "current_state": f"{state_emoji} {state.value.upper()}",
                "success": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def save_state(self, filename: str = "light_state.json"):
        """Save current light state to file"""
        try:
            state_data = {
                "lights": {self._format_room_name(room): state.value for room, state in self.lights.items()},
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_rooms": len(self.lights)
            }
            
            with open(filename, 'w') as f:
                json.dump(state_data, f, indent=4)
            
            logger.info(f"Light state saved to {filename}")
            return {
                "status": "✅ SAVED",
                "message": f"Light state saved successfully",
                "filename": filename,
                "success": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        
        except Exception as e:
            logger.error(f"Error saving state: {str(e)}")
            return {
                "status": "❌ SAVE ERROR", 
                "message": f"Failed to save state",
                "error_details": str(e),
                "success": False,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def load_state(self, filename: str = "light_state.json"):
        """Load light state from file"""
        try:
            with open(filename, 'r') as f:
                state_data = json.load(f)
            
            # Restore light states
            loaded_count = 0
            for room_name, state_str in state_data["lights"].items():
                # Find the room enum by formatted name
                for room_enum in Room:
                    if self._format_room_name(room_enum) == room_name:
                        state = LightState(state_str)
                        self.lights[room_enum] = state
                        loaded_count += 1
                        break
            
            logger.info(f"Light state loaded from {filename}")
            return {
                "status": "✅ LOADED",
                "message": f"Light state loaded successfully",
                "filename": filename,
                "rooms_loaded": loaded_count,
                "load_timestamp": state_data.get("timestamp", "Unknown"),
                "success": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        
        except FileNotFoundError:
            logger.warning(f"State file {filename} not found")
            return {
                "status": "❌ FILE NOT FOUND",
                "message": f"State file '{filename}' does not exist",
                "success": False,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            logger.error(f"Error loading state: {str(e)}")
            return {
                "status": "❌ LOAD ERROR",
                "message": f"Failed to load state",
                "error_details": str(e),
                "success": False,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def print_status(self):
        """Print a nice formatted status of all lights"""
        print("\n" + "="*50)
        print("🏠 SMART HOME LIGHT STATUS")
        print("="*50)
        
        for room, state in self.lights.items():
            room_name = self._format_room_name(room)
            emoji = "💡" if state == LightState.ON else "🔌"
            status = "ON " if state == LightState.ON else "OFF"
            print(f"{emoji} {room_name:<15} | {status}")
        
        lights_on = sum(1 for state in self.lights.values() if state == LightState.ON)
        print("="*50)
        print(f"📊 Summary: {lights_on}/{len(self.lights)} rooms have lights on")
        print("="*50 + "\n")


# Example usage and testing
def main():
    """Example usage of the SmartHomeLightManager"""
    light_manager = SmartHomeLightManager()
    
    print("🏠 SmartHome Light Manager Demo")
    print("="*40)
    
    # Test various commands
    test_commands = [
        ("living room", "on"),
        ("bedroom", "off"),
        ("kitchen", "on"),
        ("all", "on"),
        ("bathroom", "off"),
        ("none", "off"),
        ("office", "on"),
        ("invalid_room", "on"),
        ("kitchen", "invalid_state"),
    ]
    
    for room, state in test_commands:
        print(f"\n🔧 Command: control_lights('{room}', '{state}')")
        result = light_manager.control_lights(room, state)
        
        # Pretty print the result
        print(f"   Status: {result['status']}")
        print(f"   Message: {result['message']}")
        if 'room' in result:
            print(f"   Room: {result['room']}")
        if 'current_state' in result:
            print(f"   Current State: {result['current_state']}")
        print("-" * 40)
    
    # Show final status
    print("\n📊 Final Light Status:")
    light_manager.print_status()
    
    # Test status check
    print("🔍 Status Check:")
    status = light_manager.get_light_status()
    print(f"   {status['status']}: {status['summary']}")
    print(f"   Lights On: {', '.join(status['lights_on'])}")


if __name__ == "__main__":
    main()
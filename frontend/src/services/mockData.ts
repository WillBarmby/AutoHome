import { DeviceEntity, ClimateEntity, PriceData, PresenceData, ApprovalQueueItem, ChatMessage } from '@/types';

export const mockDevices: DeviceEntity[] = [
  {
    id: 'climate.thermostat_hall',
    name: 'Hall Thermostat',
    type: 'climate',
    state: 'cool',
    attributes: {
      current_temperature: 72,
      target_temperature: 72,
      humidity: 45,
      mode: 'cool',
      hvac_modes: ['heat', 'cool', 'auto', 'off']
    },
    icon: 'Thermometer',
    available: true
  } as ClimateEntity,
  {
    id: 'switch.coffee_machine',
    name: 'Coffee Machine',
    type: 'switch',
    state: false,
    attributes: { power: '0W' },
    room: 'Kitchen',
    icon: 'Coffee',
    available: true
  },
  {
    id: 'fan.office_fan',
    name: 'Office Fan',
    type: 'fan',
    state: 50,
    attributes: { percentage: 50, preset_mode: 'auto' },
    room: 'Office',
    icon: 'Fan',
    available: true
  },
  {
    id: 'light.living_room',
    name: 'Living Room',
    type: 'light',
    state: true,
    attributes: { brightness: 89, color_mode: 'brightness' },
    room: 'Living Room',
    icon: 'Lightbulb',
    available: true
  },
  {
    id: 'light.bedroom',
    name: 'Bedroom',
    type: 'light',
    state: false,
    attributes: { brightness: 0 },
    room: 'Bedroom',
    icon: 'Lightbulb',
    available: true
  },
  {
    id: 'camera.front_door',
    name: 'Front Door Camera',
    type: 'camera',
    state: 'streaming',
    attributes: { privacy: true },
    icon: 'Camera',
    available: true
  },
  {
    id: 'cover.garage',
    name: 'Garage Door',
    type: 'cover',
    state: 'closed',
    attributes: { position: 0 },
    icon: 'Garage',
    available: true
  }
];

export const mockPricing: PriceData[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  price_cents_kWh: hour >= 17 && hour <= 21 
    ? 28 + Math.random() * 4  // Peak hours
    : hour <= 6 
    ? 9 + Math.random() * 3   // Off-peak
    : 15 + Math.random() * 8, // Normal
  is_peak: hour >= 17 && hour <= 21
}));

export const mockPresence: PresenceData[] = [
  { personId: 'andre', name: 'Andre', state: 'home' },
  { personId: 'guest', name: 'Guest', state: 'away', etaMinutes: 15 }
];

export const mockApprovalQueue: ApprovalQueueItem[] = [
  {
    id: '1',
    summary: 'Open garage door',
    intent: {
      type: 'ToggleDevice',
      device: 'cover.garage',
      state: true
    },
    guardrailBadges: ['Requires Confirmation', 'Security Risk'],
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    status: 'pending'
  },
  {
    id: '2',
    summary: 'Pre-cool to 68°F until 6pm',
    intent: {
      type: 'ScheduleDevice',
      device: 'climate.thermostat_hall',
      temperature: 68,
      deadline: '18:00'
    },
    guardrailBadges: ['Cost Impact'],
    costDelta: '+$2.40',
    comfortDelta: '-2°F',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    status: 'pending'
  }
];

export const mockChatHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'Turn on living room lights at 30%',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    intent: {
      type: 'SetLevel',
      device: 'light.living_room',
      level: 30
    }
  },
  {
    id: '2',
    type: 'assistant',
    content: 'I\'ve set the living room lights to 30% brightness.',
    timestamp: new Date(Date.now() - 2 * 60 * 1000)
  }
];

export const mockVitals = {
  temperature: {
    current: 72,
    target: 72,
    outside: 85,
    deltaT: 13,
    mode: 'cool'
  },
  humidity: 45,
  energyCost: {
    current: 15.2,
    daily: 4.85,
    monthly: 142.30
  }
};
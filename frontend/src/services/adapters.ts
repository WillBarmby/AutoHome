// Adapter interfaces with optional mock fallback
import { Entity, PriceData, PresenceData, ChatIntent } from '@/types';
import { fetchDevices, executeCommand } from './api';
import { mockDevices, mockPricing, mockPresence } from './mockData';

const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? 'true').toLowerCase() !== 'false';

type ServicePayload = Record<string, unknown> | undefined;

console.log("Home Assistant Adapter running in", USE_MOCKS ? "MOCK" : "API", "mode");

// Home Assistant Adapter
export interface HomeAssistantAdapter {
  listEntities(): Promise<Entity[]>;
  getState(entityId: string): Promise<Entity | null>;
  callService(domain: string, service: string, payload?: ServicePayload): Promise<unknown>;
}

const toEntity = (device: (typeof mockDevices)[number]): Entity => ({
  entity_id: device.id,
  state: String(device.state),
  attributes: {
    friendly_name: device.name,
    ...device.attributes,
  },
  icon: device.icon,
});

class MockHomeAssistantAdapter implements HomeAssistantAdapter {
  private entities = new Map(mockDevices.map((device) => [device.id, toEntity(device)]));

  async listEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }

  async getState(entityId: string): Promise<Entity | null> {
    return this.entities.get(entityId) ?? null;
  }

  async callService(domain: string, service: string, payload?: ServicePayload): Promise<unknown> {
    const entityId = (payload as Record<string, unknown> | undefined)?.entity_id as string | undefined;
    if (!entityId) {
      throw new Error('entity_id is required for mock service calls');
    }

    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found in mock store`);
    }

    // naively update state for demo purposes
    const next = { ...entity };
    if (service === 'turn_on') {
      next.state = 'on';
    } else if (service === 'turn_off') {
      next.state = 'off';
    } else if (service === 'toggle') {
      next.state = entity.state === 'on' ? 'off' : 'on';
    } else if (service === 'set_temperature') {
      const temperature = (payload as Record<string, unknown> | undefined)?.temperature;
      if (typeof temperature === 'number') {
        next.state = String(temperature);
        next.attributes = { ...next.attributes, target_temperature: temperature };
      }
    }

    this.entities.set(entityId, next);

    return {
      status: 'mocked',
      domain,
      service,
      payload,
      state: next,
    };
  }
}

class ApiHomeAssistantAdapter implements HomeAssistantAdapter {
  async listEntities(): Promise<Entity[]> {
    return fetchDevices();
  }

  async getState(entityId: string): Promise<Entity | null> {
    const entities = await this.listEntities();
    return entities.find((entity) => entity.entity_id === entityId) ?? null;
  }

  async callService(domain: string, service: string, payload?: ServicePayload): Promise<unknown> {
    const data = (payload as Record<string, unknown> | undefined) ?? {};
    const entityId = data.entity_id as string | undefined;

    if (!entityId) {
      throw new Error('entity_id is required to execute a command');
    }

    const { entity_id: _ignored, ...rest } = data;

    return executeCommand({
      entity_id: entityId,
      service: `${domain}.${service}`,
      data: Object.keys(rest).length ? (rest as Record<string, unknown>) : undefined,
    });
  }
}

// Pricing Adapter
export interface PricingAdapter {
  get24hPrices(): Promise<PriceData[]>;
  getCurrentPrice(): Promise<number>;
}

export class MockPricingAdapter implements PricingAdapter {
  async get24hPrices(): Promise<PriceData[]> {
    return mockPricing;
  }

  async getCurrentPrice(): Promise<number> {
    const hour = new Date().getHours();
    return mockPricing[hour].price_cents_kWh;
  }
}

// Presence Adapter
export interface PresenceAdapter {
  getOccupancy(): Promise<PresenceData[]>;
}

export class MockPresenceAdapter implements PresenceAdapter {
  async getOccupancy(): Promise<PresenceData[]> {
    return mockPresence;
  }
}

// LLM Service
export interface LLMService {
  parse(text: string): Promise<ChatIntent>;
  generateResponse(intent: ChatIntent): Promise<string>;
}

export class MockLLMService implements LLMService {
  async parse(text: string): Promise<ChatIntent> {
    // Simple pattern matching for demo
    const lowerText = text.toLowerCase();

    if (lowerText.includes('turn on') || lowerText.includes('turn off')) {
      const state = lowerText.includes('turn on');
      const device = this.extractDevice(lowerText);
      return {
        type: 'ToggleDevice',
        device,
        state,
      };
    }

    if (lowerText.includes('set') && lowerText.includes('%')) {
      const level = this.extractPercentage(lowerText);
      const device = this.extractDevice(lowerText);
      return {
        type: 'SetLevel',
        device,
        level,
      };
    }

    if (lowerText.includes('temperature') || lowerText.includes('degrees')) {
      const temp = this.extractTemperature(lowerText);
      return {
        type: 'SetLevel',
        device: 'climate.thermostat_hall',
        temperature: temp,
      };
    }

    return {
      type: 'QueryStatus',
      parameters: { query: text },
    };
  }

  async generateResponse(intent: ChatIntent): Promise<string> {
    switch (intent.type) {
      case 'ToggleDevice':
        return `I've ${intent.state ? 'turned on' : 'turned off'} the ${intent.device?.replace(/\w+\./, '').replace(/_/g, ' ')}.`;
      case 'SetLevel':
        if (intent.temperature) {
          return `I've set the thermostat to ${intent.temperature}°F.`;
        }
        return `I've set the ${intent.device?.replace(/\w+\./, '').replace(/_/g, ' ')} to ${intent.level}%.`;
      default:
        return 'Command processed successfully.';
    }
  }

  private extractDevice(text: string): string {
    if (text.includes('living room')) return 'light.living_room';
    if (text.includes('bedroom')) return 'light.bedroom';
    if (text.includes('coffee')) return 'switch.coffee_machine';
    if (text.includes('fan')) return 'fan.office_fan';
    if (text.includes('garage')) return 'cover.garage';
    if (text.includes('thermostat')) return 'climate.thermostat_hall';
    return 'unknown';
  }

  private extractPercentage(text: string): number {
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 50;
  }

  private extractTemperature(text: string): number {
    const match = text.match(/(\d+)(?:°|degrees)/);
    return match ? parseInt(match[1], 10) : 72;
  }
}

// Service instances
export const haAdapter: HomeAssistantAdapter = USE_MOCKS
  ? new MockHomeAssistantAdapter()
  : new ApiHomeAssistantAdapter();
export const pricingAdapter = new MockPricingAdapter();
export const presenceAdapter = new MockPresenceAdapter();
export const llmService = new MockLLMService();

export { USE_MOCKS };

// Adapter interfaces and mock implementations
import { DeviceEntity, PriceData, PresenceData, ChatIntent } from '@/types';
import { mockDevices, mockPricing, mockPresence } from './mockData';

// Home Assistant Adapter
export interface HomeAssistantAdapter {
  listEntities(): Promise<DeviceEntity[]>;
  getState(entityId: string): Promise<DeviceEntity | null>;
  callService(domain: string, service: string, payload: any): Promise<void>;
}

export class MockHomeAssistantAdapter implements HomeAssistantAdapter {
  private entities = new Map(mockDevices.map(d => [d.id, d]));

  async listEntities(): Promise<DeviceEntity[]> {
    return Array.from(this.entities.values());
  }

  async getState(entityId: string): Promise<DeviceEntity | null> {
    return this.entities.get(entityId) || null;
  }

  async callService(domain: string, service: string, payload: any): Promise<void> {
    console.log(`[HA] Calling ${domain}.${service}`, payload);
    
    if (payload.entity_id) {
      const entity = this.entities.get(payload.entity_id);
      if (entity) {
        // Simulate state changes
        if (service === 'turn_on') {
          entity.state = true;
        } else if (service === 'turn_off') {
          entity.state = false;
        } else if (service === 'set_temperature' && payload.temperature) {
          entity.state = payload.temperature;
          (entity as any).attributes.target_temperature = payload.temperature;
          // Simulate gradual temperature change
          setTimeout(() => {
            (entity as any).attributes.current_temperature = payload.temperature;
            this.entities.set(entity.id, entity);
          }, 1000);
        } else if (service === 'turn_on' && payload.brightness) {
          entity.state = payload.brightness;
          (entity as any).attributes.brightness = payload.brightness;
        }
        this.entities.set(entity.id, entity);
      }
    }
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
        state
      };
    }
    
    if (lowerText.includes('set') && lowerText.includes('%')) {
      const level = this.extractPercentage(lowerText);
      const device = this.extractDevice(lowerText);
      return {
        type: 'SetLevel',
        device,
        level
      };
    }
    
    if (lowerText.includes('temperature') || lowerText.includes('degrees')) {
      const temp = this.extractTemperature(lowerText);
      return {
        type: 'SetLevel',
        device: 'climate.thermostat_hall',
        temperature: temp
      };
    }
    
    return {
      type: 'QueryStatus',
      parameters: { query: text }
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
    return match ? parseInt(match[1]) : 50;
  }

  private extractTemperature(text: string): number {
    const match = text.match(/(\d+)(?:°|degrees)/);
    return match ? parseInt(match[1]) : 72;
  }
}

// Service instances
export const haAdapter = new MockHomeAssistantAdapter();
export const pricingAdapter = new MockPricingAdapter();
export const presenceAdapter = new MockPresenceAdapter();
export const llmService = new MockLLMService();
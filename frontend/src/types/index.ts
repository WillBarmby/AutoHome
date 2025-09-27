// Core types for the Home Assistant AI Panel

export interface Entity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  icon?: string;
}

export interface Command {
  entity_id: string;
  service: string;
  data?: Record<string, any>;
}

export interface DeviceEntity {
  id: string;
  name: string;
  type: 'switch' | 'light' | 'climate' | 'sensor' | 'cover' | 'camera' | 'fan';
  state: string | number | boolean;
  attributes: Record<string, any>;
  room?: string;
  icon: string;
  available: boolean;
}

export interface ClimateEntity extends DeviceEntity {
  type: 'climate';
  state: 'heat' | 'cool' | 'auto' | 'off';
  attributes: {
    current_temperature: number;
    target_temperature: number;
    humidity: number;
    mode: string;
    hvac_modes: string[];
  };
}

export interface PriceData {
  hour: number;
  price_cents_kWh: number;
  is_peak: boolean;
}

export interface PresenceData {
  personId: string;
  name: string;
  state: 'home' | 'away';
  etaMinutes?: number;
}

export interface ChatIntent {
  type: 'ToggleDevice' | 'SetLevel' | 'ScheduleDevice' | 'RunOptimization' | 'SetPolicy' | 'QueryStatus';
  device?: string;
  state?: boolean | number | string;
  level?: number;
  temperature?: number;
  before?: string;
  after?: string;
  deadline?: string;
  cheapest?: boolean;
  avoid_peak?: boolean;
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: ChatIntent;
}

export interface ApprovalQueueItem {
  id: string;
  summary: string;
  intent: ChatIntent;
  guardrailBadges: string[];
  costDelta?: string;
  comfortDelta?: string;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export type OperationMode = 'manual' | 'auto' | 'paused';

export interface SystemGuardrail {
  deviceId: string;
  minValue?: number;
  maxValue?: number;
  quietHours?: { start: string; end: string };
  requiresConfirmation: boolean;
  maxActionsPerHour: number;
}

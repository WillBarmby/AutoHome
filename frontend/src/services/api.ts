import type {
  Entity,
  Command,
  ChatIntent,
  ChatMessage,
  ApprovalQueueItem,
  DashboardSnapshot,
  OperationMode,
} from "../types";
import type { UserProfile } from "@/types/userProfile";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  console.error("VITE_API_BASE_URL is not set! API calls will fail.");
  throw new Error("Missing VITE_API_BASE_URL");
}

console.log("Using API_BASE =", API_BASE);

export type { Command };

export async function fetchDevices(): Promise<Entity[]> {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) {
    throw new Error("Failed to fetch devices");
  }
  return res.json();
}

export async function executeCommand(cmd: Command): Promise<unknown> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) {
    throw new Error("Failed to execute command");
  }
  return res.json();
}

const mapChatMessage = (raw: any): ChatMessage => ({
  ...raw,
  timestamp: new Date(raw.timestamp),
});

const mapApprovalItem = (raw: any): ApprovalQueueItem => ({
  ...raw,
  expiresAt: new Date(raw.expiresAt),
});

export async function fetchDashboard(): Promise<DashboardSnapshot> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) {
    throw new Error("Failed to fetch dashboard state");
  }
  const data = await res.json();
  return {
    pricing: data.pricing,
    vitals: data.vitals,
    chatHistory: Array.isArray(data.chat_history)
      ? data.chat_history.map(mapChatMessage)
      : [],
    approvalQueue: Array.isArray(data.approval_queue)
      ? data.approval_queue.map(mapApprovalItem)
      : [],
    operationMode: data.operation_mode as OperationMode,
  };
}

export async function updateOperationMode(mode: OperationMode): Promise<DashboardSnapshot> {
  const res = await fetch(`${API_BASE}/dashboard/operation-mode`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    throw new Error("Failed to update operation mode");
  }
  const data = await res.json();
  return {
    pricing: data.pricing,
    vitals: data.vitals,
    chatHistory: data.chat_history.map(mapChatMessage),
    approvalQueue: data.approval_queue.map(mapApprovalItem),
    operationMode: data.operation_mode as OperationMode,
  };
}

export async function updateApprovalStatus(
  itemId: string,
  status: ApprovalQueueItem["status"],
): Promise<DashboardSnapshot> {
  const res = await fetch(`${API_BASE}/dashboard/approvals/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error("Failed to update approval");
  }
  const data = await res.json();
  return {
    pricing: data.pricing,
    vitals: data.vitals,
    chatHistory: data.chat_history.map(mapChatMessage),
    approvalQueue: data.approval_queue.map(mapApprovalItem),
    operationMode: data.operation_mode as OperationMode,
  };
}

interface ApprovalCreatePayload {
  summary: string;
  intent: ChatIntent;
  guardrailBadges?: string[];
  costDelta?: string;
  comfortDelta?: string;
  expiresInSeconds?: number;
}

export async function createApprovalItem(payload: ApprovalCreatePayload): Promise<DashboardSnapshot> {
  const res = await fetch(`${API_BASE}/dashboard/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create approval item");
  }
  const data = await res.json();
  return {
    pricing: data.pricing,
    vitals: data.vitals,
    chatHistory: data.chat_history.map(mapChatMessage),
    approvalQueue: data.approval_queue.map(mapApprovalItem),
    operationMode: data.operation_mode as OperationMode,
  };
}

interface ChatResultPayload {
  intent: ChatIntent;
  response: string;
  user: ChatMessage;
  assistant: ChatMessage;
}

export async function sendChatMessage(text: string): Promise<ChatResultPayload> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error("Failed to send chat message");
  }
  const data = await res.json();
  return {
    intent: data.intent,
    response: data.response,
    user: mapChatMessage(data.user),
    assistant: mapChatMessage(data.assistant),
  };
}

export async function clearChatHistory(): Promise<void> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to clear chat history");
  }
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/user-profile`);
  if (!res.ok) {
    throw new Error("Failed to fetch user profile");
  }
  const data = await res.json();
  return {
    ...data,
    updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined,
  };
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const payload = {
    ...profile,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
  const res = await fetch(`${API_BASE}/user-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to save user profile");
  }
  const data = await res.json();
  return {
    ...data,
    updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined,
  };
}

// =============== HOME ASSISTANT INTEGRATION API ===============

export interface TemperatureCalculationRequest {
  current_temp: number;
  target_temp: number;
  location: string;
  square_footage?: number;
  num_cooling_units?: number;
  arrival_time?: string;
  send_to_ha?: boolean;
}

export interface TemperatureCalculationResult {
  time_needed: number;
  current_temp: number;
  target_temp: number;
  outdoor_temp: number;
  efficiency_factor: number;
  status: string;
  square_footage?: number;
  num_units?: number;
  location?: string;
}

export interface HAConnectionStatus {
  connected: boolean;
  ha_url?: string;
  mock_mode: boolean;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface ClimateControlRequest {
  entity_id: string;
  temperature?: number;
  hvac_mode?: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  unit: string;
}

export async function calculateTemperature(request: TemperatureCalculationRequest): Promise<TemperatureCalculationResult> {
  const res = await fetch(`${API_BASE}/ha/calculate-temperature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error("Failed to calculate temperature");
  }
  const data = await res.json();
  return data.result;
}

export async function checkHAConnection(): Promise<HAConnectionStatus> {
  const res = await fetch(`${API_BASE}/ha/connection`);
  if (!res.ok) {
    throw new Error("Failed to check HA connection");
  }
  return res.json();
}

export async function getHAEntities(): Promise<HAEntity[]> {
  const res = await fetch(`${API_BASE}/ha/entities`);
  if (!res.ok) {
    throw new Error("Failed to get HA entities");
  }
  return res.json();
}

export async function getClimateEntities(): Promise<HAEntity[]> {
  const res = await fetch(`${API_BASE}/ha/climate-entities`);
  if (!res.ok) {
    throw new Error("Failed to get climate entities");
  }
  return res.json();
}

export async function getEntityState(entityId: string): Promise<HAEntity> {
  const res = await fetch(`${API_BASE}/ha/entity/${entityId}`);
  if (!res.ok) {
    throw new Error("Failed to get entity state");
  }
  return res.json();
}

export async function setClimateTemperature(request: ClimateControlRequest): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/ha/climate/set-temperature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error("Failed to set climate temperature");
  }
  return res.json();
}

export async function getWeather(city: string): Promise<WeatherData> {
  const res = await fetch(`${API_BASE}/ha/weather/${city}`);
  if (!res.ok) {
    throw new Error("Failed to get weather data");
  }
  return res.json();
}

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

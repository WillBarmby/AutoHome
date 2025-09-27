import type { Entity, Command } from "../types";

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

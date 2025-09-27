import type { Entity, Command } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type { Command };

export async function fetchDevices(): Promise<Entity[]> {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) {
    throw new Error("Failed to fetch devices");
  }
  return res.json();
}

import type { Entity } from "@/types";
import { executeCommand, fetchDevices } from "@/services/api";

export interface HomeAssistantAdapter {
  listEntities(): Promise<Entity[]>;
  getState(entityId: string): Promise<Entity | null>;
  callService(domain: string, service: string, payload?: Record<string, unknown>): Promise<unknown>;
}

class ApiHomeAssistantAdapter implements HomeAssistantAdapter {
  async listEntities(): Promise<Entity[]> {
    return fetchDevices();
  }

  async getState(entityId: string): Promise<Entity | null> {
    const entities = await this.listEntities();
    return entities.find((entity) => entity.entity_id === entityId) ?? null;
  }

  async callService(domain: string, service: string, payload?: Record<string, unknown>): Promise<unknown> {
    const data = payload ?? {};
    const entityId = data.entity_id as string | undefined;

    if (!entityId) {
      throw new Error("entity_id is required to execute a command");
    }

    const { entity_id: _ignored, ...rest } = data;

    return executeCommand({
      entity_id: entityId,
      service: `${domain}.${service}`,
      data: Object.keys(rest).length ? rest : undefined,
    });
  }
}

export const haAdapter: HomeAssistantAdapter = new ApiHomeAssistantAdapter();

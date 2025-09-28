import type { DeviceEntity, Entity } from "@/types";

const ICON_MAP: Record<string, string> = {
  climate: "Thermometer",
  light: "Lightbulb",
  fan: "Fan",
  switch: "Power",
  cover: "Garage",
  camera: "Camera",
};

const SUPPORTED_TYPES = new Set<DeviceEntity["type"]>([
  "switch",
  "light",
  "climate",
  "sensor",
  "cover",
  "camera",
  "fan",
]);

function resolveType(domain: string): DeviceEntity["type"] {
  if (SUPPORTED_TYPES.has(domain as DeviceEntity["type"])) {
    return domain as DeviceEntity["type"];
  }
  if (domain === "binary_sensor" || domain === "sensor") {
    return "sensor";
  }
  return "switch";
}

function resolveState(domain: string, entity: Entity): string | number | boolean {
  const attributes = entity.attributes ?? {};
  if (domain === "light") {
    return entity.state === "on";
  }
  if (domain === "fan") {
    if (typeof attributes.percentage === "number") {
      return attributes.percentage;
    }
    return entity.state === "on" ? 100 : 0;
  }
  if (domain === "climate") {
    if (typeof attributes.target_temperature === "number") {
      return attributes.target_temperature;
    }
    const numericState = Number(entity.state);
    return Number.isFinite(numericState) ? numericState : entity.state;
  }
  if (domain === "cover") {
    return entity.state;
  }
  if (domain === "switch") {
    return entity.state === "on";
  }
  return entity.state;
}

function resolveIcon(domain: string, entityIcon?: string): string {
  if (domain in ICON_MAP) {
    return ICON_MAP[domain];
  }
  if (entityIcon) {
    return entityIcon;
  }
  return "Power";
}

export function entityToDevice(entity: Entity): DeviceEntity {
  const [domain] = entity.entity_id.split(".");
  const type = resolveType(domain);
  const state = resolveState(domain, entity);
  const attributes = entity.attributes ?? {};
  const available = entity.state !== "unavailable" && attributes.available !== false;

  return {
    id: entity.entity_id,
    name: attributes.friendly_name ?? entity.entity_id,
    type,
    state,
    attributes,
    room: attributes.room ?? attributes.area ?? undefined,
    icon: resolveIcon(domain, entity.icon),
    available,
  };
}

export function mapEntitiesToDevices(entities: Entity[]): DeviceEntity[] {
  return entities.map(entityToDevice);
}

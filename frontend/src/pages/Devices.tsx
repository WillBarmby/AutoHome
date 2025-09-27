import { useCallback, useEffect, useState } from "react";

import type { Entity } from "@/types";
import { haAdapter } from "@/services/adapters";
import { useToast } from "@/hooks/use-toast";

const Devices = () => {
  const [devices, setDevices] = useState<Entity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDevices = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const data = await haAdapter.listEntities();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDevices(true).catch((err) => {
      console.error("Failed to fetch devices", err);
    });
  }, [loadDevices]);

  const handleToggle = async (device: Entity) => {
    const [domain] = device.entity_id.split(".");

    setExecutingId(device.entity_id);

    try {
      const response = await haAdapter.callService(domain, "toggle", {
        entity_id: device.entity_id,
      });

      let nextState: string | undefined;
      if (response && typeof response === "object") {
        const payload = response as Record<string, unknown>;
        const candidate = (() => {
          const entityValue = payload.entity;
          if (entityValue && typeof entityValue === "object") {
            return entityValue;
          }
          const stateValue = payload.state;
          if (stateValue && typeof stateValue === "object") {
            return stateValue;
          }
          return null;
        })();
        if (candidate && typeof candidate === "object") {
          const raw = (candidate as Record<string, unknown>).state;
          if (typeof raw === "string") {
            nextState = raw;
          }
        }
      }

      await loadDevices();

      const friendlyName = device.attributes.friendly_name ?? device.entity_id;
      toast({
        title: "Command sent",
        description: nextState
          ? `${friendlyName} is now ${nextState}.`
          : `${friendlyName} was updated successfully.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Command failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setExecutingId(null);
    }
  };

  if (loading) {
    return <p>Loading devices…</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>Failed to load devices.</p>
        <p>{error}</p>
        <button type="button" onClick={() => loadDevices(true)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ul>
      {devices.map((device) => (
        <li key={device.entity_id}>
          <strong>{device.attributes.friendly_name ?? device.entity_id}</strong>
          {" — "}
          <span>{device.state}</span>
          {device.icon ? ` (${device.icon})` : null}
          {" "}
          <button
            type="button"
            onClick={() => handleToggle(device)}
            disabled={executingId === device.entity_id}
          >
            {executingId === device.entity_id ? "Toggling…" : "Toggle"}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default Devices;

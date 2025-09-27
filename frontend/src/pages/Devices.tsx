import { useEffect, useState } from "react";

import type { Entity } from "@/types";
import { executeCommand, fetchDevices } from "@/services/api";

const Devices = () => {
  const [devices, setDevices] = useState<Entity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDevices = async () => {
      try {
        const data = await fetchDevices();
        if (isMounted) {
          setDevices(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p>Loading devices…</p>;
  }

  if (error) {
    return <p role="alert">Failed to load devices: {error}</p>;
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
            onClick={async () => {
              try {
                const response = await executeCommand({
                  entity_id: device.entity_id,
                  service: "light.toggle",
                });
                console.log("Command response", response);
              } catch (err) {
                console.error("Failed to execute command", err);
              }
            }}
          >
            Toggle
          </button>
        </li>
      ))}
    </ul>
  );
};

export default Devices;

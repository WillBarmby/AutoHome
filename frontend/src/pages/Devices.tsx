import { useCallback, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useRef } from "react";
import { motion } from "framer-motion";

import type { Entity } from "@/types";
import { haAdapter } from "@/services/adapters";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, AlertCircle, Cpu, Lightbulb, Thermometer, Power, Fan, PlugZap, Info } from "lucide-react";

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
      await haAdapter.callService(domain, "toggle", {
        entity_id: device.entity_id,
      });

      await loadDevices();

      const friendlyName = device.attributes.friendly_name ?? device.entity_id;
      const currentState = device.state;
      const newState = currentState === "on" ? "off" : "on";
      
      toast({
        title: "Device updated",
        description: `${friendlyName} is now ${newState}.`,
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

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const devicesRef = useRef<HTMLDivElement>(null);

  // Animate elements on mount
  useEffect(() => {
    const elements = [headerRef.current, devicesRef.current].filter(Boolean);
    
    if (elements.length > 0) {
      gsap.fromTo(elements, 
        { 
          y: 30, 
          opacity: 0 
        },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.15,
          ease: 'power2.out' 
        }
      );
    }
  }, []);

  const getDeviceIcon = (device: Entity) => {
    const icon = (device.icon || device.attributes?.icon || "").toLowerCase();
    const [domain] = device.entity_id.split(".");

    if (icon.includes("light") || domain === "light") return Lightbulb;
    if (icon.includes("thermo") || domain === "climate") return Thermometer;
    if (icon.includes("fan") || domain === "fan") return Fan;
    if (icon.includes("plug") || domain === "switch") return PlugZap;
    return Power;
  };

  const getDeviceType = (device: Entity) => {
    const [domain] = device.entity_id.split(".");
    return domain;
  };

  const formatDeviceTypeLabel = (deviceType: string) => {
    const mapping: Record<string, string> = {
      light: "Light",
      switch: "Switch",
      climate: "Thermostat",
      fan: "Fan",
      cover: "Cover",
      sensor: "Sensor",
    };
    return mapping[deviceType] ?? deviceType;
  };

  const describeStateDetails = (device: Entity) => {
    const attrs = device.attributes ?? {};
    const [domain] = device.entity_id.split(".");

    if (domain === "light") {
      if (typeof attrs.brightness === "number") {
        const percent = Math.round((attrs.brightness / 255) * 100);
        return `Brightness ${percent}%`;
      }
      if (typeof attrs.color_temp === "number") {
        return `Color temp ${attrs.color_temp}`;
      }
    }

    if (domain === "climate") {
      const current = attrs.current_temperature ?? attrs.temperature;
      const target = attrs.temperature ?? attrs.target_temp;
      const mode = attrs.hvac_mode ?? device.state;
      const pieces: string[] = [];
      if (typeof current === "number") pieces.push(`Indoor ${Math.round(current)}°F`);
      if (typeof target === "number") pieces.push(`Target ${Math.round(target)}°F`);
      if (mode) pieces.push(String(mode).toLowerCase());
      return pieces.join(" • ");
    }

    if (domain === "fan") {
      const speed = attrs.percentage ?? attrs.speed;
      if (typeof speed === "number") {
        return `Speed ${speed}%`;
      }
    }

    const rawValue = attrs.state ?? attrs.value;
    if (rawValue !== undefined) {
      const valueText = Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue);
      const unit = attrs.unit_of_measurement ? ` ${attrs.unit_of_measurement}` : "";
      return `${valueText}${unit}`.trim();
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-10 min-h-screen bg-gradient-main bg-dot-grid flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading devices…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 min-h-screen bg-gradient-main bg-dot-grid">
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to load devices
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadDevices(true)} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDevices = devices.filter(device => device.state === "on");

  return (
    <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Devices</h1>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Control your smart home devices here</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {activeDevices.length} of {devices.length} active
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadDevices(true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Devices List */}
      <div ref={devicesRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => {
          const Icon = getDeviceIcon(device);
          const deviceType = getDeviceType(device);
          const friendlyName = device.attributes.friendly_name ?? device.entity_id;
          const isOn = device.state === "on";
          const isExecuting = executingId === device.entity_id;
          const deviceTypeLabel = formatDeviceTypeLabel(deviceType);
          const detail = describeStateDetails(device);

          return (
            <Card
              key={device.entity_id}
              className="bg-gradient-card border-card-border transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5"
            >
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full transition-colors ${
                      isOn 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">{friendlyName}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize border-muted-foreground/40 text-muted-foreground">
                          {deviceTypeLabel}
                        </Badge>
                        <span className={isOn ? "text-primary font-medium" : "text-muted-foreground"}>
                          {isOn ? "On" : "Off"}
                        </span>
                      </div>
                      {detail && (
                        <p className="text-xs text-muted-foreground/80">
                          {detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(device)}
                    disabled={isExecuting}
                    className="flex items-center gap-2 transition-colors"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Toggling…
                      </>
                    ) : (
                      "Toggle"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Devices;

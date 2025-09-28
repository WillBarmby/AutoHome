import { useCallback, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useRef } from "react";

import type { Entity } from "@/types";
import { haAdapter } from "@/services/adapters";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, Home, Lightbulb, Thermometer, Power } from "lucide-react";

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
        { y: 30, opacity: 0 },
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
    const icon = device.icon || device.attributes.icon;
    if (icon?.includes('lightbulb')) return Lightbulb;
    if (icon?.includes('thermometer')) return Thermometer;
    return Power;
  };

  const getDeviceType = (device: Entity) => {
    const [domain] = device.entity_id.split(".");
    return domain;
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
          <Home className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Devices</h1>
            <p className="text-sm text-muted-foreground">Control your smart home devices</p>
          </div>
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
      <div ref={devicesRef} className="space-y-4">
        {devices.map((device) => {
          const Icon = getDeviceIcon(device);
          const deviceType = getDeviceType(device);
          const friendlyName = device.attributes.friendly_name ?? device.entity_id;
          const isOn = device.state === "on";
          const isExecuting = executingId === device.entity_id;

          return (
            <Card key={device.entity_id} className="bg-gradient-card border-card-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full transition-colors ${
                      isOn 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-foreground">{friendlyName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {deviceType} • {isOn ? "on" : "off"}
                        {device.icon && ` (${device.icon})`}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(device)}
                    disabled={isExecuting}
                    className="flex items-center gap-2"
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

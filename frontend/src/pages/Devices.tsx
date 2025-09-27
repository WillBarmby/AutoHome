// <<<<<<< frontend
// import { useState, useRef, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Slider } from "@/components/ui/slider";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { 
//   Thermometer,
//   Lightbulb,
//   Camera,
//   Coffee,
//   Fan,
//   Car,
//   ChevronDown,
//   ChevronUp,
//   Power,
//   Info
// } from "lucide-react";
// import { DeviceEntity } from "@/types";
// import { mockDevices } from "@/services/mockData";
// =======
// import { useCallback, useEffect, useState } from "react";

// import type { Entity } from "@/types";
// >>>>>>> main
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
// <<<<<<< frontend
//   }, []);

//   const getTypeIcon = (type: string) => {
//     switch (type) {
//       case 'light': return <Lightbulb className="h-5 w-5" />;
//       case 'climate': return <Thermometer className="h-5 w-5" />;
//       case 'camera': return <Camera className="h-5 w-5" />;
//       case 'switch': return <Coffee className="h-5 w-5" />;
//       case 'fan': return <Fan className="h-5 w-5" />;
//       case 'cover': return <Car className="h-5 w-5" />;
//       default: return <Power className="h-5 w-5" />;
//     }
//   };

//   const getDeviceDetails = (device: DeviceEntity) => {
//     switch (device.type) {
//       case 'climate':
//         return (
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-muted-foreground">Temperature</span>
//               <span className="text-lg font-bold">{device.state}°F</span>
//             </div>
//             <div className="space-y-2">
//               <label className="text-sm text-muted-foreground">Set Temperature</label>
//               <Slider
//                 value={[typeof device.state === 'number' ? device.state : 70]}
//                 onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
//                 max={85}
//                 min={60}
//                 step={0.1}
//                 className="w-full"
//               />
//             </div>
//           </div>
//         );
//       case 'light':
//         return (
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-muted-foreground">Brightness</span>
//               <span className="text-lg font-bold">
//                 {typeof device.state === 'number' ? device.state : (device.state ? 100 : 0)}%
//               </span>
//             </div>
//             <div className="space-y-2">
//               <label className="text-sm text-muted-foreground">Brightness Level</label>
//               <Slider
//                 value={[typeof device.state === 'number' ? device.state : (device.state ? 100 : 0)]}
//                 onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
//                 max={100}
//                 min={0}
//                 step={5}
//                 className="w-full"
//               />
//             </div>
//           </div>
//         );
//       case 'camera':
//         return (
//           <div className="space-y-4">
//             <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
//               <Camera className="h-12 w-12 text-muted-foreground" />
//             </div>
//             <div className="text-sm text-muted-foreground">
//               Camera is {device.state ? 'recording' : 'offline'}
//             </div>
//           </div>
//         );
//       case 'switch':
//         return (
//           <div className="space-y-4">
//             <div className="text-sm text-muted-foreground">
//               Coffee machine is {device.state ? 'brewing' : 'ready'}
//             </div>
//             {device.state && (
//               <div className="text-xs text-muted-foreground">
//                 Estimated time remaining: 3 minutes
//               </div>
//             )}
//           </div>
//         );
//       case 'fan':
//         return (
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-muted-foreground">Speed</span>
//               <span className="text-lg font-bold">
//                 {typeof device.state === 'number' ? device.state : (device.state ? 3 : 0)}/3
//               </span>
//             </div>
//             <div className="space-y-2">
//               <label className="text-sm text-muted-foreground">Fan Speed</label>
//               <Slider
//                 value={[typeof device.state === 'number' ? device.state : (device.state ? 3 : 0)]}
//                 onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
//                 max={3}
//                 min={0}
//                 step={1}
//                 className="w-full"
//               />
//             </div>
//           </div>
//         );
//       case 'cover':
//         return (
//           <div className="space-y-4">
//             <div className="text-sm text-muted-foreground">
//               Garage door is {device.state ? 'open' : 'closed'}
//             </div>
//             <div className="text-xs text-muted-foreground">
//               Last opened: 2 hours ago
//             </div>
//           </div>
//         );
//       default:
//         return (
//           <div className="text-sm text-muted-foreground">
//             Device is {device.state ? 'on' : 'off'}
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <h1 className="text-2xl font-bold text-foreground tracking-wide">Device Control</h1>
//           <TooltipProvider>
//             <Tooltip>
//               <TooltipTrigger asChild>
//                 <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
//               </TooltipTrigger>
//               <TooltipContent side="right">
//                 <p>Click on any device to view details and controls</p>
//               </TooltipContent>
//             </Tooltip>
//           </TooltipProvider>
//         </div>
        
//         <div className="flex items-center gap-3">
//           <Badge variant="secondary" className="text-xs">
//             {activeDevices} of {devices.length} active
//           </Badge>
//         </div>
//       </div>

//       {/* Device Tabs */}
//       <div className="space-y-2">
//         {devices.map((device) => (
//           <Card 
//             key={device.id} 
//             ref={(el) => cardRefs.current[device.id] = el}
//             className="bg-gradient-card border-card-border"
// =======
//   }

//   return (
//     <ul>
//       {devices.map((device) => (
//         <li key={device.entity_id}>
//           <strong>{device.attributes.friendly_name ?? device.entity_id}</strong>
//           {" — "}
//           <span>{device.state}</span>
//           {device.icon ? ` (${device.icon})` : null}
//           {" "}
//           <button
//             type="button"
//             onClick={() => handleToggle(device)}
//             disabled={executingId === device.entity_id}
// >>>>>>> main
          >
            {executingId === device.entity_id ? "Toggling…" : "Toggle"}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default Devices;

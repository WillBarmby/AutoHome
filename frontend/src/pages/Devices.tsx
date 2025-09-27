import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Thermometer,
  Lightbulb,
  Camera,
  Coffee,
  Fan,
  Car,
  ChevronDown,
  ChevronUp,
  Power,
  Info
} from "lucide-react";
import { DeviceEntity } from "@/types";
import { mockDevices } from "@/services/mockData";
import { haAdapter } from "@/services/adapters";
import { gsap } from "gsap";

const Devices = () => {
  const [devices, setDevices] = useState<DeviceEntity[]>(mockDevices);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleDeviceToggle = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      const newState = !device.state;
      await haAdapter.callService(
        device.type, 
        newState ? 'turn_on' : 'turn_off', 
        { entity_id: deviceId }
      );
      
      setDevices(prev => 
        prev.map(d => 
          d.id === deviceId 
            ? { ...d, state: newState }
            : d
        )
      );
    } catch (error) {
      console.error('Failed to toggle device:', error);
    }
  };

  const handleDeviceLevelChange = async (deviceId: string, level: number) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      if (device.type === 'climate') {
        await haAdapter.callService('climate', 'set_temperature', {
          entity_id: deviceId,
          temperature: level
        });
      } else {
        await haAdapter.callService('light', 'turn_on', {
          entity_id: deviceId,
          brightness: level
        });
      }
      
      setDevices(prev => 
        prev.map(d => 
          d.id === deviceId 
            ? { ...d, state: level, attributes: { ...d.attributes, brightness: level }}
            : d
        )
      );
    } catch (error) {
      console.error('Failed to change device level:', error);
    }
  };

  const activeDevices = devices.filter(d => d.state).length;

  // GSAP Animation Functions
  const animateCardExpand = (deviceId: string) => {
    const content = contentRefs.current[deviceId];
    if (!content) return;

    // Set initial state
    gsap.set(content, { 
      height: 0, 
      opacity: 0,
      overflow: 'hidden',
      display: 'block'
    });

    // Force a reflow to ensure the element is rendered
    content.offsetHeight;

    // Animate to expanded state
    gsap.to(content, {
      height: 'auto',
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out'
    });
  };

  const animateCardCollapse = (deviceId: string) => {
    const content = contentRefs.current[deviceId];
    if (!content) return;

    // Get current height before animating
    const currentHeight = content.offsetHeight;
    
    // Set the height to current height first
    gsap.set(content, { height: currentHeight });
    
    // Animate to collapsed state
    gsap.to(content, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(content, { 
          overflow: 'hidden',
          display: 'none'
        });
      }
    });
  };

  const handleCardClick = (deviceId: string) => {
    if (expandedDevice === deviceId) {
      // Collapse current card
      animateCardCollapse(deviceId);
      setExpandedDevice(null);
    } else {
      // Collapse any previously expanded card
      if (expandedDevice) {
        animateCardCollapse(expandedDevice);
      }
      
      // Expand new card
      setExpandedDevice(deviceId);
      // Use setTimeout to ensure state update happens before animation
      setTimeout(() => {
        animateCardExpand(deviceId);
      }, 10);
    }
  };

  // Animate cards on mount
  useEffect(() => {
    const cards = Object.values(cardRefs.current).filter(Boolean);
    gsap.fromTo(cards, 
      { 
        y: 20, 
        opacity: 0 
      },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.6, 
        stagger: 0.1,
        ease: 'power2.out'
      }
    );
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'light': return <Lightbulb className="h-5 w-5" />;
      case 'climate': return <Thermometer className="h-5 w-5" />;
      case 'camera': return <Camera className="h-5 w-5" />;
      case 'switch': return <Coffee className="h-5 w-5" />;
      case 'fan': return <Fan className="h-5 w-5" />;
      case 'cover': return <Car className="h-5 w-5" />;
      default: return <Power className="h-5 w-5" />;
    }
  };

  const getDeviceDetails = (device: DeviceEntity) => {
    switch (device.type) {
      case 'climate':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="text-lg font-bold">{device.state}°F</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Set Temperature</label>
              <Slider
                value={[typeof device.state === 'number' ? device.state : 70]}
                onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
                max={85}
                min={60}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        );
      case 'light':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Brightness</span>
              <span className="text-lg font-bold">
                {typeof device.state === 'number' ? device.state : (device.state ? 100 : 0)}%
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Brightness Level</label>
              <Slider
                value={[typeof device.state === 'number' ? device.state : (device.state ? 100 : 0)]}
                onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        );
      case 'camera':
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              Camera is {device.state ? 'recording' : 'offline'}
            </div>
          </div>
        );
      case 'switch':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Coffee machine is {device.state ? 'brewing' : 'ready'}
            </div>
            {device.state && (
              <div className="text-xs text-muted-foreground">
                Estimated time remaining: 3 minutes
              </div>
            )}
          </div>
        );
      case 'fan':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Speed</span>
              <span className="text-lg font-bold">
                {typeof device.state === 'number' ? device.state : (device.state ? 3 : 0)}/3
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Fan Speed</label>
              <Slider
                value={[typeof device.state === 'number' ? device.state : (device.state ? 3 : 0)]}
                onValueChange={(value) => handleDeviceLevelChange(device.id, value[0])}
                max={3}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        );
      case 'cover':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Garage door is {device.state ? 'open' : 'closed'}
            </div>
            <div className="text-xs text-muted-foreground">
              Last opened: 2 hours ago
            </div>
          </div>
        );
      default:
        return (
          <div className="text-sm text-muted-foreground">
            Device is {device.state ? 'on' : 'off'}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Device Control</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Click on any device to view details and controls</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {activeDevices} of {devices.length} active
          </Badge>
        </div>
      </div>

      {/* Device Tabs */}
      <div className="space-y-2">
        {devices.map((device) => (
          <Card 
            key={device.id} 
            ref={(el) => cardRefs.current[device.id] = el}
            className="bg-gradient-card border-card-border"
          >
            <CardHeader 
              className="cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => handleCardClick(device.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(device.type)}
                  <div>
                    <CardTitle className="text-lg tracking-wide">{device.name}</CardTitle>
                    <div className="text-sm text-muted-foreground capitalize">
                      {device.type} • {device.state ? 'ON' : 'OFF'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={device.state ? "default" : "secondary"}>
                    {device.state ? 'Active' : 'Inactive'}
                  </Badge>
                  {expandedDevice === device.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
            
            <div 
              ref={(el) => contentRefs.current[device.id] = el}
              style={{ display: 'none' }}
            >
              <CardContent className="pt-0">
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Controls</h3>
                    <Button
                      variant={device.state ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleDeviceToggle(device.id)}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      {device.state ? 'Turn Off' : 'Turn On'}
                    </Button>
                  </div>
                  {getDeviceDetails(device)}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Devices;
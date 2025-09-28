import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  Settings, 
  Save,
  RotateCcw,
  Info,
  Thermometer,
  Lightbulb,
  Camera,
  Coffee,
  Fan,
  Car,
  Power,
  Globe
} from "lucide-react";
import { DeviceEntity } from "@/types";
import DeviceCarousel, { DeviceCarouselItem } from "@/components/DeviceCarousel";
import { haAdapter } from "@/services/adapters";
import { mapEntitiesToDevices } from "@/lib/deviceMapper";

interface GuardrailSettings {
  deviceId: string;
  deviceName: string;
  enabled: boolean;
  allowedActions: string[];
  minValue?: number;
  maxValue?: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  maxActionsPerHour: number;
  requireConfirmation: boolean;
}

const Guardrail = () => {
  const iconForDevice = (device: DeviceEntity) => {
    const commonProps = { className: "h-[16px] w-[16px] text-white" };
    switch (device.type) {
      case 'climate':
        return <Thermometer {...commonProps} />;
      case 'light':
        return <Lightbulb {...commonProps} />;
      case 'camera':
        return <Camera {...commonProps} />;
      case 'switch':
        return <Coffee {...commonProps} />;
      case 'fan':
        return <Fan {...commonProps} />;
      case 'cover':
        return <Car {...commonProps} />;
      default:
        return <Power {...commonProps} />;
    }
  };

  const toCarouselItem = (device: DeviceEntity): DeviceCarouselItem => {
    // Map device IDs to their corresponding images
    const getDeviceImage = (deviceId: string): string | undefined => {
      const imageMap: Record<string, string> = {
        'climate.bedroom': '/imgs/hall-thermo.jpg',
        'light.living_room': '/imgs/living-room.webp',
        'light.bedroom': '/imgs/bedroom-light.webp',
        'switch.coffee_machine': '/imgs/coffee-machine.webp',
        'fan.office_fan': '/imgs/office-fan.jpg',
        'cover.garage': '/imgs/garage-door.webp',
        'camera.front_door': '/imgs/front-door-camera.jpeg',
      };
      return imageMap[deviceId];
    };

    return {
      title: device.name,
      description: device.room ? `Located in ${device.room}` : `${device.type} device`,
      id: device.id,
      type: device.type,
      icon: iconForDevice(device),
      image: getDeviceImage(device.id),
    };
  };

  const buildGuardrailSettings = (device: DeviceEntity): GuardrailSettings => ({
    deviceId: device.id,
    deviceName: device.name,
    enabled: true,
    allowedActions: ['turn_on', 'turn_off'],
    minValue: device.type === 'climate' ? 18 : 0,
    maxValue: device.type === 'climate' ? 26 : 100,
    quietHoursStart: 22,
    quietHoursEnd: 7,
    maxActionsPerHour: device.type === 'climate' ? 2 : 10,
    requireConfirmation: device.id.includes('garage') || device.id.includes('lock'),
  });

  const [devices, setDevices] = useState<DeviceEntity[]>([]);
  
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const [selectedDevice, setSelectedDevice] = useState<DeviceCarouselItem | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailSettings[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const entities = await haAdapter.listEntities();
        const mapped = mapEntitiesToDevices(entities);
        setDevices(mapped);
        setGuardrails(mapped.map(buildGuardrailSettings));
        setSelectedDevice(mapped.length ? toCarouselItem(mapped[0]) : null);
      } catch (error) {
        console.error('Failed to load devices for guardrails', error);
      }
    };

    void load();
  }, []);

  const [globalSettings, setGlobalSettings] = useState({
    enableAllGuardrails: true,
    emergencyOverride: false,
    logAllActions: true,
    notifyOnBlock: true
  });

  const updateGuardrail = (deviceId: string, updates: Partial<GuardrailSettings>) => {
    setGuardrails(prev => 
      prev.map(g => 
        g.deviceId === deviceId 
          ? { ...g, ...updates }
          : g
      )
    );
  };

  const resetToDefaults = () => {
    setGuardrails(
      devices.map(device => ({
        deviceId: device.id,
        deviceName: device.name,
        enabled: true,
        allowedActions: ['turn_on', 'turn_off'],
        minValue: device.type === 'climate' ? 18 : 0,
        maxValue: device.type === 'climate' ? 26 : 100,
        quietHoursStart: 22,
        quietHoursEnd: 7,
        maxActionsPerHour: device.type === 'climate' ? 2 : 10,
        requireConfirmation: device.id.includes('garage') || device.id.includes('lock')
      }))
    );
  };

  const saveSettings = () => {
    // Simulate saving to backend
    console.log('Saving guardrail settings...', { guardrails, globalSettings });
    // Show toast notification here
  };

  const enabledGuardrails = guardrails.filter(g => g.enabled).length;
  const highSecurityDevices = guardrails.filter(g => g.requireConfirmation).length;

  const handleDeviceSelect = (device: DeviceCarouselItem) => {
    setSelectedDevice(device);
  };

  const handleIndexChange = (index: number, device: DeviceCarouselItem) => {
    setSelectedDevice(device);
  };

  const getCurrentGuardrail = () => {
    if (!selectedDevice) return null;
    return guardrails.find(g => g.deviceId === selectedDevice.id);
  };

  const updateCurrentGuardrail = (updates: Partial<GuardrailSettings>) => {
    if (!selectedDevice) return;
    setGuardrails(prev => 
      prev.map(g => 
        g.deviceId === selectedDevice.id 
          ? { ...g, ...updates }
          : g
      )
    );
  };

  // Animate elements on mount
  useEffect(() => {
    const elements = [
      headerRef.current,
      cardsRef.current,
      carouselRef.current,
      settingsRef.current
    ].filter(Boolean);

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
  }, []);

  return (
    <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Guardrails</h1>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Configure safety limits and restrictions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {enabledGuardrails} active
          </Badge>
          <Badge variant="destructive" className="text-xs">
            {highSecurityDevices} secured
          </Badge>
        </div>
      </div>

      {/* Global Settings */}
      <div ref={cardsRef}>
        <Card className="bg-gradient-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg tracking-wide">
            <Globe className="h-5 w-5" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-all">Enable All Guardrails</Label>
              <Switch
                id="enable-all"
                checked={globalSettings.enableAllGuardrails}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, enableAllGuardrails: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="emergency">Emergency Override</Label>
              <Switch
                id="emergency"
                checked={globalSettings.emergencyOverride}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, emergencyOverride: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="log-actions">Log All Actions</Label>
              <Switch
                id="log-actions"
                checked={globalSettings.logAllActions}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, logAllActions: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notify">Notify on Block</Label>
              <Switch
                id="notify"
                checked={globalSettings.notifyOnBlock}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, notifyOnBlock: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Device Carousel and Settings */}
        <div ref={carouselRef} className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Device-Specific Rules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Carousel */}
            <div className="flex justify-center lg:justify-start">
              <DeviceCarousel
                baseWidth={580}
                items={devices.map(toCarouselItem)}
                onDeviceSelect={handleDeviceSelect}
                onIndexChange={handleIndexChange}
              />
            </div>

            {/* Device Settings */}
            <div ref={settingsRef} className="flex justify-center">
              <div className="w-full max-w-md space-y-4" style={{ width: '580px' }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  {selectedDevice ? (
                    <AnimatePresence mode="wait">
                      <motion.h3 
                        key={selectedDevice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="text-base font-semibold tracking-wide text-foreground"
                      >
                        {selectedDevice.title}
                      </motion.h3>
                    </AnimatePresence>
                  ) : (
                    <h3 className="text-base font-semibold tracking-wide text-foreground">
                      Select a device
                    </h3>
                  )}
                  <div className="flex items-center gap-2">
                    {getCurrentGuardrail()?.requireConfirmation && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High Security
                      </Badge>
                    )}
                    <Switch
                      checked={getCurrentGuardrail()?.enabled || false}
                      onCheckedChange={(checked) => 
                        updateCurrentGuardrail({ enabled: checked })
                      }
                      disabled={false}
                    />
                  </div>
                </div>
                
                {/* Settings Content */}
                <div className="space-y-4">
              {/* Value Limits */}
              <div className="space-y-2">
                <Label className="text-sm">Value Limits</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      value={getCurrentGuardrail()?.minValue || 0}
                      onChange={(e) => 
                        updateCurrentGuardrail({ 
                          minValue: parseInt(e.target.value) 
                        })
                      }
                      className="h-8"
  disabled={false}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      value={getCurrentGuardrail()?.maxValue || 100}
                      onChange={(e) => 
                        updateCurrentGuardrail({ 
                          maxValue: parseInt(e.target.value) 
                        })
                      }
                      className="h-8"
  disabled={false}
                    />
                  </div>
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quiet Hours
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={getCurrentGuardrail()?.quietHoursStart || 22}
                      onChange={(e) => 
                        updateCurrentGuardrail({ 
                          quietHoursStart: parseInt(e.target.value) 
                        })
                      }
                      className="h-8"
  disabled={false}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={getCurrentGuardrail()?.quietHoursEnd || 7}
                      onChange={(e) => 
                        updateCurrentGuardrail({ 
                          quietHoursEnd: parseInt(e.target.value) 
                        })
                      }
                      className="h-8"
  disabled={false}
                    />
                  </div>
                </div>
              </div>

              {/* Rate Limiting */}
              <div className="space-y-2">
                <Label className="text-sm">Max Actions per Hour: {getCurrentGuardrail()?.maxActionsPerHour || 10}</Label>
                <Slider
                  value={[getCurrentGuardrail()?.maxActionsPerHour || 10]}
                  onValueChange={([value]) => 
                    updateCurrentGuardrail({ maxActionsPerHour: value })
                  }
                  max={20}
                  min={1}
                  step={1}
                  className="flex-1"
                  disabled={!selectedDevice}
                />
              </div>

                  {/* Confirmation Required */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Require Confirmation</Label>
                    <Switch
                      checked={getCurrentGuardrail()?.requireConfirmation || false}
                      onCheckedChange={(checked) => 
                        updateCurrentGuardrail({ requireConfirmation: checked })
                      }
                      disabled={!selectedDevice}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={saveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Guardrail;

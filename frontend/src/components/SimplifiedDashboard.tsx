import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { motion } from "framer-motion";
import { CircularMeter } from "./CircularMeter";
import { ChatConsole } from "./ChatConsole";
import { OperationModeToggle } from "./OperationModeToggle";
import ElasticSlider from "./ElasticSlider";
import { SmartThermostat } from "./SmartThermostat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Bell,
  Minus,
  Plus,
  Zap,
  Hand,
  Pause,
  Home,
  Settings,
  Database
} from "lucide-react";
import {
  DeviceEntity,
  ChatMessage,
  OperationMode,
  ApprovalQueueItem,
  PriceData,
  DashboardVitals,
} from "@/types";
import { mapEntitiesToDevices } from "@/lib/deviceMapper";
import {
  fetchDashboard,
  createApprovalItem,
  sendChatMessage,
  updateApprovalStatus,
  updateOperationMode,
  clearChatHistory,
} from "@/services/api";
import { haAdapter } from "@/services/adapters";

interface SimplifiedDashboardProps {
  className?: string;
}

export function SimplifiedDashboard({ className }: SimplifiedDashboardProps) {
  const [devices, setDevices] = useState<DeviceEntity[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [operationMode, setOperationMode] = useState<OperationMode>('auto');
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueItem[]>([]);
  const [vitals, setVitals] = useState<DashboardVitals | null>(null);
  const [pricing, setPricing] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [localClimateTemperature, setLocalClimateTemperature] = useState<number | null>(null);
  const climateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isClimateAdjusting, setIsClimateAdjusting] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      try {
        const [entities, snapshot] = await Promise.all([
          haAdapter.listEntities(),
          fetchDashboard(),
        ]);
        setDevices(mapEntitiesToDevices(entities));
        setChatMessages(snapshot.chatHistory);
        setApprovalQueue(snapshot.approvalQueue);
        setVitals(snapshot.vitals);
        setPricing(snapshot.pricing);
        setOperationMode(snapshot.operationMode);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const chatConsoleRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  
  // Operation mode button refs
  const autoButtonRef = useRef<HTMLButtonElement>(null);
  const manualButtonRef = useRef<HTMLButtonElement>(null);
  const pausedButtonRef = useRef<HTMLButtonElement>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const entities = await haAdapter.listEntities();
      setDevices(mapEntitiesToDevices(entities));
      // Don't clear local climate temperature here - let it persist until user stops adjusting
    } catch (err) {
      console.error('Failed to refresh devices', err);
    }
  }, []);

  const isDeviceActive = useCallback((device: DeviceEntity) => {
    if (typeof device.state === 'boolean') return device.state;
    if (typeof device.state === 'number') return device.state > 0;
    if (typeof device.state === 'string') return device.state === 'on' || device.state === 'open';
    return false;
  }, []);

  const handleDeviceToggle = async (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;

    const isCurrentlyOn = (() => {
      if (typeof device.state === 'boolean') return device.state;
      if (typeof device.state === 'number') return device.state > 0;
      if (typeof device.state === 'string') return device.state === 'on' || device.state === 'open';
      return false;
    })();

    try {
      const domain = device.type;
      await haAdapter.callService(
        domain,
        isCurrentlyOn ? 'turn_off' : 'turn_on',
        { entity_id: deviceId },
      );
      await refreshDevices();
    } catch (error) {
      console.error('Failed to toggle device:', error);
    }
  };

  const handleDeviceLevelChange = async (deviceId: string, level: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    if (device.type === 'climate') {
      // Set adjusting flag and update local state immediately
      setIsClimateAdjusting(true);
      setLocalClimateTemperature(level);
      
      // Clear existing timeout
      if (climateTimeoutRef.current) {
        clearTimeout(climateTimeoutRef.current);
      }
      
      // Debounce the API call
      climateTimeoutRef.current = setTimeout(async () => {
        try {
          await haAdapter.callService('climate', 'set_temperature', {
            entity_id: deviceId,
            temperature: level
          });
          // Keep the local state and adjusting flag - don't reset to device state
          console.log(`Climate temperature set to ${level}°F`);
        } catch (error) {
          console.error('Failed to change device level:', error);
          // Only reset on error
          setIsClimateAdjusting(false);
          setLocalClimateTemperature(null);
        }
      }, 800);
    } else {
      // For lights and other devices, set brightness/level
      try {
        await haAdapter.callService('light', 'turn_on', {
          entity_id: deviceId,
          brightness: level
        });
        await refreshDevices();
      } catch (error) {
        console.error('Failed to change device level:', error);
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const result = await sendChatMessage(message);
      const { intent, user, assistant } = result;

      setChatMessages((prev) => [...prev, user, assistant]);

      if (operationMode === 'auto') {
        if (intent.type === 'ToggleDevice' && intent.device && intent.device !== 'cover.garage') {
          await handleDeviceToggle(intent.device);
        }
      } else if (operationMode === 'manual' || intent.device === 'cover.garage') {
        try {
          const snapshot = await createApprovalItem({
            summary: message,
            intent,
            guardrailBadges: intent.device === 'cover.garage' ? ['Requires Confirmation'] : [],
            expiresInSeconds: 5 * 60,
          });
          setApprovalQueue(snapshot.approvalQueue);
          setChatMessages(snapshot.chatHistory);
          setOperationMode(snapshot.operationMode);
        } catch (err) {
          console.error('Failed to create approval item', err);
        }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  };

  const handleClearMessages = async () => {
    try {
      await clearChatHistory();
      setChatMessages([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      // Fallback to just clearing frontend state
      setChatMessages([]);
    }
  };

  const handleApprovalAction = async (itemId: string, action: 'approve' | 'reject') => {
    try {
      const snapshot = await updateApprovalStatus(itemId, action === 'approve' ? 'approved' : 'rejected');
      setApprovalQueue(snapshot.approvalQueue);
      setChatMessages(snapshot.chatHistory);
      setOperationMode(snapshot.operationMode);

      if (action === 'approve') {
        const item = snapshot.approvalQueue.find((entry) => entry.id === itemId);
        if (item?.intent.type === 'ToggleDevice' && item.intent.device) {
          await handleDeviceToggle(item.intent.device);
        }
      }
    } catch (error) {
      console.error('Failed to update approval item', error);
    }
  };

  const handleOperationModeChange = async (mode: OperationMode) => {
    // Animate the clicked button
    const buttonRefs = {
      auto: autoButtonRef,
      manual: manualButtonRef,
      paused: pausedButtonRef
    };
    
    const clickedButton = buttonRefs[mode].current;
    if (clickedButton) {
      gsap.fromTo(clickedButton, 
        { scale: 1 },
        { 
          scale: 0.95, 
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out'
        }
      );
    }
    try {
      const snapshot = await updateOperationMode(mode);
      setOperationMode(snapshot.operationMode);
      setApprovalQueue(snapshot.approvalQueue);
      setChatMessages(snapshot.chatHistory);
    } catch (error) {
      console.error('Failed to update operation mode', error);
    }
  };

  const currentPrice = pricing[new Date().getHours()]?.price_cents_kWh ?? 15;
  const peakHours = pricing.filter(p => p.is_peak).map(p => p.hour);
  const isCurrentlyPeak = peakHours.includes(new Date().getHours());

  const vitalsData: DashboardVitals = vitals ?? {
    temperature: {
      current: 0,
      target: 0,
      outside: 0,
      deltaT: 0,
      mode: 'off',
    },
    humidity: 0,
    energyCost: {
      current: 0,
      daily: 0,
      monthly: 0,
    },
  };

  // Get key devices for circular meters - reactive to device state changes
  const thermostat = devices.find(d => d.type === 'climate');
  const lights = devices.filter(d => d.type === 'light');
  const totalLightBrightness = lights.reduce((sum, light) => {
    if (typeof light.state === 'number') {
      return sum + light.state;
    }
    return sum + (isDeviceActive(light) ? 100 : 0);
  }, 0);
  const avgLightBrightness = lights.length > 0 ? totalLightBrightness / lights.length : 0;
  
  // Calculate reactive values for meters
  const currentTemperature = thermostat ? 
    (thermostat.attributes?.current_temperature || vitalsData.temperature.current) : 
    vitalsData.temperature.current;
    
  const targetTemperature = thermostat ? 
    (isClimateAdjusting ? localClimateTemperature : (thermostat.attributes?.target_temperature || vitalsData.temperature.target)) : 
    vitalsData.temperature.target;
    
  const activeDeviceCount = devices.filter(isDeviceActive).length;

  // Get reactive color based on temperature
  const getTemperatureColor = (temp: number) => {
    if (temp >= 60 && temp <= 68) return 'cold'; // Blue
    if (temp >= 68.1 && temp <= 77) return 'warning'; // Yellow
    if (temp >= 77.1 && temp <= 85) return 'destructive'; // Red
    return 'cold'; // Default
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (climateTimeoutRef.current) {
        clearTimeout(climateTimeoutRef.current);
      }
    };
  }, []);

  // Animate elements when not loading
  useEffect(() => {
    if (!loading) {
      const elements = [
        headerRef.current,
        chatConsoleRef.current,
        leftColumnRef.current,
        rightColumnRef.current
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
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="p-10 min-h-screen bg-gradient-main bg-dot-grid">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 min-h-screen bg-gradient-main bg-dot-grid text-destructive">
        Failed to load dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Home Control</h1>
          </div>
          
          {/* Operation Mode Segmented Control - Moved to left */}
          <div className="flex items-center gap-3">
            <div className="flex bg-muted rounded-lg p-1">
              <motion.button
                ref={autoButtonRef}
                onClick={() => void handleOperationModeChange('auto')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  operationMode === 'auto'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Auto (Safe) - Safe actions execute automatically"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotate: operationMode === 'auto' ? [0, -10, 10, -10, 0] : 0,
                  transition: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                <motion.div
                  animate={{
                    scale: operationMode === 'auto' ? [1, 1.2, 1] : 1,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                >
                  <Zap className="h-4 w-4" />
                </motion.div>
                {operationMode === 'auto' && (
                  <motion.span 
                    className="text-sm font-medium whitespace-nowrap"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Auto
                  </motion.span>
                )}
              </motion.button>
              <motion.button
                ref={manualButtonRef}
                onClick={() => void handleOperationModeChange('manual')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  operationMode === 'manual'
                    ? 'bg-yellow-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Manual - All actions require approval"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotate: operationMode === 'manual' ? [0, -5, 5, -5, 0] : 0,
                  transition: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                <motion.div
                  animate={{
                    scale: operationMode === 'manual' ? [1, 1.2, 1] : 1,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                >
                  <Hand className="h-4 w-4" />
                </motion.div>
                {operationMode === 'manual' && (
                  <motion.span 
                    className="text-sm font-medium whitespace-nowrap"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Manual
                  </motion.span>
                )}
              </motion.button>
              <motion.button
                ref={pausedButtonRef}
                onClick={() => void handleOperationModeChange('paused')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  operationMode === 'paused'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Paused - All automation disabled"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotate: operationMode === 'paused' ? [0, -15, 15, -15, 0] : 0,
                  transition: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                <motion.div
                  animate={{
                    scale: operationMode === 'paused' ? [1, 1.2, 1] : 1,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                >
                  <Pause className="h-4 w-4" />
                </motion.div>
                {operationMode === 'paused' && (
                  <motion.span 
                    className="text-sm font-medium whitespace-nowrap"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Paused
                  </motion.span>
                )}
              </motion.button>
            </div>
            
            {/* Short Description */}
            <motion.div 
              key={operationMode}
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1],
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              {operationMode === 'auto' ? 'Safe auto execution' :
               operationMode === 'manual' ? 'Requires approval' :
               'All automation disabled'}
            </motion.div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={isCurrentlyPeak ? "destructive" : "secondary"} className="text-xs">
            {isCurrentlyPeak ? 'Peak' : 'Off-Peak'}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            {currentPrice.toFixed(1)}¢/kWh
          </div>
          
          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-muted hover:text-white"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>


      {/* Notifications Popup - Fixed positioning to appear above everything */}
      {notificationsOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-16 right-8 w-80 bg-background border border-border rounded-lg shadow-lg z-[9999]"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-sm">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-border/50">
              <div className="text-xs font-medium mb-1">Energy Optimization</div>
              <div className="text-xs text-muted-foreground mb-2">Pre-cooling started for peak hours</div>
              <div className="text-xs text-green-400">2 min ago</div>
            </div>
            
            <div className="p-3 border-b border-border/50">
              <div className="text-xs font-medium mb-1">Device Status</div>
              <div className="text-xs text-muted-foreground mb-2">Living room lights dimmed to 35%</div>
              <div className="text-xs text-blue-400">5 min ago</div>
            </div>
            
            <div className="p-3">
              <div className="text-xs font-medium mb-1">Security Alert</div>
              <div className="text-xs text-muted-foreground mb-2">Front door camera motion detected</div>
              <div className="text-xs text-yellow-400">12 min ago</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="home-assistant">
              Home Assistant
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="dashboard" className="space-y-8 pt-6">
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            {/* Left Column - Chat Console */}
            <div ref={chatConsoleRef}>
              <ChatConsole
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onClearMessages={handleClearMessages}
              />
            </div>

            {/* Right Column - Temperature and Climate Meters */}
            <div className="flex flex-col justify-center items-center space-y-6">
              {/* Climate Control Section */}
              {thermostat && (
                <div className="flex flex-col items-center space-y-4">
                  {/* Climate Toggle Segmented Control */}
                  <div className="flex bg-muted rounded-lg p-1 mb-2">
                    <button
                      onClick={() => {
                        if (!thermostat.state) {
                          handleDeviceToggle(thermostat.id);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        thermostat.state
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ON
                    </button>
                    <button
                      onClick={() => {
                        if (thermostat.state) {
                          handleDeviceToggle(thermostat.id);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        !thermostat.state
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      OFF
                    </button>
                  </div>
                  
                  <div className={`transition-opacity duration-300 ease-in-out ${!thermostat.state ? 'opacity-50' : 'opacity-100'}`}>
                    <CircularMeter
                      value={targetTemperature}
                      max={85}
                      min={60}
                      unit="°F"
                      label="Climate"
                      color={getTemperatureColor(targetTemperature)}
                      size="lg"
                      showControls={false}
                      isActive={!!thermostat.state}
                      useCircularSlider={false}
                    />
                  </div>
                  <div className={`flex flex-col items-center space-y-2 transition-opacity duration-300 ease-in-out ${!thermostat.state ? 'opacity-50' : 'opacity-100'}`}>
                    <span className="text-sm text-muted-foreground">Temperature Control</span>
                    <ElasticSlider
                      key={`${thermostat.id}-${targetTemperature}`}
                      defaultValue={targetTemperature}
                      startingValue={60}
                      maxValue={85}
                      isStepped={true}
                      stepSize={0.1}
                      leftIcon={<Minus className="h-4 w-4" />}
                      rightIcon={<Plus className="h-4 w-4" />}
                      onValueChange={(value) => handleDeviceLevelChange(thermostat.id, value)}
                      className={`w-64 ${!thermostat.state ? 'opacity-50' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* Temperature and Secondary Meters */}
              <div className="flex items-center space-x-6">
                {/* Temperature - Large */}
                <CircularMeter
                  value={currentTemperature}
                  max={85}
                  unit="°F"
                  label="Temperature"
                  color="primary"
                  size="lg"
                />
                
                {/* Secondary Meters - Triangle layout */}
                <div className="flex items-center space-x-3">
                  {/* Daily Cost - Left */}
                  <CircularMeter
                    value={vitalsData.energyCost.daily}
                    max={50}
                    unit="$"
                    label="Daily Cost"
                    color="warning"
                    size="sm"
                    decimalPlaces={2}
                  />
                  
                  {/* Right side - Humidity and Devices stacked */}
                  <div className="flex flex-col space-y-3">
                    {/* Humidity - Top */}
                    <CircularMeter
                      value={vitalsData.humidity}
                      max={100}
                      unit="%"
                      label="Humidity"
                      color="accent"
                      size="sm"
                      decimalPlaces={0}
                    />
                    
                    {/* Active Devices - Bottom */}
                    <CircularMeter
                      value={activeDeviceCount}
                      max={devices.length}
                      unit="on"
                      label="Devices"
                      color="accent"
                      size="sm"
                      decimalPlaces={0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="home-assistant" className="space-y-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <SmartThermostat />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

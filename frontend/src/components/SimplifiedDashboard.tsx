import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { CircularMeter } from "./CircularMeter";
import { ChatConsole } from "./ChatConsole";
import { OperationModeToggle } from "./OperationModeToggle";
import ElasticSlider from "./ElasticSlider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Pause
} from "lucide-react";
import { 
  DeviceEntity, 
  ChatMessage, 
  ChatIntent, 
  OperationMode, 
  ApprovalQueueItem 
} from "@/types";
import { 
  mockDevices, 
  mockVitals, 
  mockChatHistory, 
  mockApprovalQueue,
  mockPricing
} from "@/services/mockData";
import { haAdapter, llmService } from "@/services/adapters";

interface SimplifiedDashboardProps {
  className?: string;
}

export function SimplifiedDashboard({ className }: SimplifiedDashboardProps) {
  const [devices, setDevices] = useState<DeviceEntity[]>(mockDevices);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatHistory);
  const [operationMode, setOperationMode] = useState<OperationMode>('auto');
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueItem[]>(mockApprovalQueue);
  const [vitals] = useState(mockVitals);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const chatConsoleRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  
  // Operation mode button refs
  const autoButtonRef = useRef<HTMLButtonElement>(null);
  const manualButtonRef = useRef<HTMLButtonElement>(null);
  const pausedButtonRef = useRef<HTMLButtonElement>(null);

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
        // For climate devices, set temperature
        await haAdapter.callService('climate', 'set_temperature', {
          entity_id: deviceId,
          temperature: level
        });
        
        setDevices(prev => 
          prev.map(d => 
            d.id === deviceId 
              ? { 
                  ...d, 
                  state: level, 
                  attributes: { 
                    ...d.attributes, 
                    target_temperature: level,
                    current_temperature: d.attributes?.current_temperature || level
                  }
                }
              : d
          )
        );
      } else {
        // For lights and other devices, set brightness/level
        await haAdapter.callService('light', 'turn_on', {
          entity_id: deviceId,
          brightness: level
        });
        
        setDevices(prev => 
          prev.map(d => 
            d.id === deviceId 
              ? { ...d, state: level, attributes: { ...d.attributes, brightness: level }}
              : d
          )
        );
      }
    } catch (error) {
      console.error('Failed to change device level:', error);
    }
  };

  const handleSendMessage = async (message: string, intent: ChatIntent) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      intent
    };

    setChatMessages(prev => [...prev, userMessage]);

    try {
      const response = await llmService.generateResponse(intent);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);

      if (operationMode === 'manual' || intent.device === 'cover.garage') {
        const approvalItem: ApprovalQueueItem = {
          id: Date.now().toString(),
          summary: message,
          intent,
          guardrailBadges: intent.device === 'cover.garage' ? ['Requires Confirmation'] : [],
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          status: 'pending'
        };
        setApprovalQueue(prev => [...prev, approvalItem]);
      } else if (operationMode === 'auto') {
        if (intent.type === 'ToggleDevice' && intent.device && intent.device !== 'cover.garage') {
          handleDeviceToggle(intent.device);
        }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  };

  const handleApprovalAction = (itemId: string, action: 'approve' | 'reject') => {
    setApprovalQueue(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' }
          : item
      )
    );

    if (action === 'approve') {
      const item = approvalQueue.find(i => i.id === itemId);
      if (item?.intent.type === 'ToggleDevice' && item.intent.device) {
        handleDeviceToggle(item.intent.device);
      }
    }
  };

  const handleOperationModeChange = (mode: OperationMode) => {
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
    
    setOperationMode(mode);
  };

  const currentPrice = mockPricing[new Date().getHours()]?.price_cents_kWh || 15;
  const peakHours = mockPricing.filter(p => p.is_peak).map(p => p.hour);
  const isCurrentlyPeak = peakHours.includes(new Date().getHours());

  // Get key devices for circular meters - reactive to device state changes
  const thermostat = devices.find(d => d.type === 'climate');
  const lights = devices.filter(d => d.type === 'light');
  const totalLightBrightness = lights.reduce((sum, light) => {
    if (light.state && typeof light.state === 'number') {
      return sum + light.state;
    }
    return sum + (light.state ? 100 : 0);
  }, 0);
  const avgLightBrightness = lights.length > 0 ? totalLightBrightness / lights.length : 0;
  
  // Calculate reactive values for meters
  const currentTemperature = thermostat ? 
    (typeof thermostat.state === 'number' ? thermostat.state : 
     thermostat.attributes?.current_temperature || vitals.temperature.current) : 
    vitals.temperature.current;
    
  const targetTemperature = thermostat ? 
    (typeof thermostat.state === 'number' ? thermostat.state : 
     thermostat.attributes?.target_temperature || vitals.temperature.target) : 
    vitals.temperature.target;
    
  const activeDeviceCount = devices.filter(d => d.state).length;

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

  // Animate elements on mount
  useEffect(() => {
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
  }, []);

  return (
    <div className="space-y-8 p-6 min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Home Control</h1>
          <p className="text-sm text-muted-foreground">AI Assistant Panel</p>
        </div>
        
        {/* Operation Mode Segmented Control - Centered */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            ref={autoButtonRef}
            onClick={() => handleOperationModeChange('auto')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              operationMode === 'auto'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Auto (Safe) - Safe actions execute automatically"
          >
            <Zap className="h-4 w-4" />
            {operationMode === 'auto' && (
              <span className="text-sm font-medium whitespace-nowrap">Auto</span>
            )}
          </button>
          <button
            ref={manualButtonRef}
            onClick={() => handleOperationModeChange('manual')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              operationMode === 'manual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Manual - All actions require approval"
          >
            <Hand className="h-4 w-4" />
            {operationMode === 'manual' && (
              <span className="text-sm font-medium whitespace-nowrap">Manual</span>
            )}
          </button>
          <button
            ref={pausedButtonRef}
            onClick={() => handleOperationModeChange('paused')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              operationMode === 'paused'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Paused - All automation disabled"
          >
            <Pause className="h-4 w-4" />
            {operationMode === 'paused' && (
              <span className="text-sm font-medium whitespace-nowrap">Paused</span>
            )}
          </button>
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
              className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-4 w-4" />
            </Button>
            
            {/* Notifications Popup */}
            {notificationsOpen && (
              <div className="absolute right-0 top-10 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Console */}
      <div ref={chatConsoleRef}>
        <ChatConsole
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Circular Meters - Condensed Layout */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center py-8">
            {/* Left Column - Climate Control */}
            <div ref={leftColumnRef} className="flex flex-col justify-center items-center space-y-4">
              {thermostat && (
                <>
                  {/* Climate Toggle Segmented Control */}
                  <div className="flex bg-muted rounded-lg p-1 mb-2">
                    <button
                      onClick={() => handleDeviceToggle(thermostat.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        thermostat.state
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ON
                    </button>
                    <button
                      onClick={() => handleDeviceToggle(thermostat.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        !thermostat.state
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      OFF
                    </button>
                  </div>
                  
                  <CircularMeter
                    value={targetTemperature}
                    max={85}
                    min={60}
                    unit="°F"
                    label="Climate"
                    color="warning"
                    size="lg"
                    showControls={false}
                    isActive={!!thermostat.state}
                    useCircularSlider={false}
                  />
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-sm text-muted-foreground">Temperature Control</span>
                    <ElasticSlider
                      defaultValue={targetTemperature}
                      startingValue={60}
                      maxValue={85}
                      isStepped={true}
                      stepSize={1}
                      leftIcon={<Minus className="h-4 w-4" />}
                      rightIcon={<Plus className="h-4 w-4" />}
                      onValueChange={(value) => handleDeviceLevelChange(thermostat.id, value)}
                      className="w-64"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Temperature and secondary meters */}
            <div ref={rightColumnRef} className="flex flex-col justify-center items-center space-y-4">
              {/* Temperature - Large */}
              <CircularMeter
                value={currentTemperature}
                max={85}
                unit="°F"
                label="Temperature"
                color="primary"
                size="lg"
              />
              
              {/* Secondary Meters - Underneath Temperature */}
              <div className="grid grid-cols-3 gap-3">
                {/* Humidity */}
                <CircularMeter
                  value={vitals.humidity}
                  max={100}
                  unit="%"
                  label="Humidity"
                  color="accent"
                  size="sm"
                  decimalPlaces={0}
                />
                
                {/* Energy Cost */}
                <CircularMeter
                  value={vitals.energyCost.daily}
                  max={50}
                  unit="$"
                  label="Daily Cost"
                  color="warning"
                  size="sm"
                  decimalPlaces={2}
                />
                
                {/* Active Devices */}
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

      </div>
    </div>
  );
}
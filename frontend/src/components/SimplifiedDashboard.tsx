import { useState, useEffect } from "react";
import { CircularMeter } from "./CircularMeter";
import { ChatConsole } from "./ChatConsole";
import { OperationModeToggle } from "./OperationModeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Bell
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

  const currentPrice = mockPricing[new Date().getHours()]?.price_cents_kWh || 15;
  const peakHours = mockPricing.filter(p => p.is_peak).map(p => p.hour);
  const isCurrentlyPeak = peakHours.includes(new Date().getHours());

  // Get key devices for circular meters
  const thermostat = devices.find(d => d.type === 'climate');
  const lights = devices.filter(d => d.type === 'light');
  const totalLightBrightness = lights.reduce((sum, light) => {
    if (light.state && typeof light.state === 'number') {
      return sum + light.state;
    }
    return sum + (light.state ? 100 : 0);
  }, 0);
  const avgLightBrightness = lights.length > 0 ? totalLightBrightness / lights.length : 0;

  return (
    <div className="space-y-8 p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Home Control</h1>
          <p className="text-sm text-muted-foreground">AI Assistant Panel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={isCurrentlyPeak ? "destructive" : "secondary"} className="text-xs">
            {isCurrentlyPeak ? 'Peak' : 'Off-Peak'}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            {currentPrice.toFixed(1)}¢/kWh
          </div>
        </div>
      </div>

      {/* Operation Mode */}
      <OperationModeToggle
        mode={operationMode}
        onModeChange={setOperationMode}
        pendingApprovals={approvalQueue.filter(i => i.status === 'pending').length}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Circular Meters */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-3 gap-6">
            {/* Temperature */}
            <CircularMeter
              value={vitals.temperature.current}
              max={30}
              unit="°C"
              label="Temperature"
              color="primary"
              size="md"
            />
            
            {/* Humidity */}
            <CircularMeter
              value={vitals.humidity}
              max={100}
              unit="%"
              label="Humidity"
              color="accent"
              size="md"
            />
            
            {/* Heating/Cooling */}
            {thermostat && (
              <CircularMeter
                value={typeof thermostat.state === 'number' ? thermostat.state : vitals.temperature.target}
                max={30}
                unit="°C"
                label="Climate"
                color="warning"
                size="md"
                showControls={true}
                isActive={!!thermostat.state}
                onToggle={() => handleDeviceToggle(thermostat.id)}
                onIncrease={() => {
                  const currentTemp = typeof thermostat.state === 'number' ? thermostat.state : vitals.temperature.target;
                  handleDeviceLevelChange(thermostat.id, Math.min(currentTemp + 1, 30));
                }}
                onDecrease={() => {
                  const currentTemp = typeof thermostat.state === 'number' ? thermostat.state : vitals.temperature.target;
                  handleDeviceLevelChange(thermostat.id, Math.max(currentTemp - 1, 15));
                }}
              />
            )}
            
            {/* All Lights Average */}
            <CircularMeter
              value={avgLightBrightness}
              max={100}
              unit="%"
              label="All Lights"
              color="success"
              size="md"
              showControls={true}
              isActive={lights.some(l => l.state)}
              onToggle={() => {
                const anyLightOn = lights.some(l => l.state);
                lights.forEach(light => {
                  if (anyLightOn) {
                    handleDeviceToggle(light.id);
                  } else if (!light.state) {
                    handleDeviceToggle(light.id);
                  }
                });
              }}
            />
            
            {/* Energy Cost */}
            <CircularMeter
              value={vitals.energyCost.daily}
              max={50}
              unit="$"
              label="Daily Cost"
              color="warning"
              size="md"
            />
            
            {/* Active Devices */}
            <CircularMeter
              value={devices.filter(d => d.state).length}
              max={devices.length}
              unit="on"
              label="Devices"
              color="accent"
              size="md"
            />
          </div>
        </div>

        {/* Sidebar - Notifications */}
        <div className="space-y-4">
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Recent Notifications */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium mb-1">Energy Optimization</div>
                <div className="text-xs text-muted-foreground mb-2">Pre-cooling started for peak hours</div>
                <div className="text-xs text-green-400">2 min ago</div>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium mb-1">Device Status</div>
                <div className="text-xs text-muted-foreground mb-2">Living room lights dimmed to 35%</div>
                <div className="text-xs text-blue-400">5 min ago</div>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium mb-1">Security Alert</div>
                <div className="text-xs text-muted-foreground mb-2">Front door camera motion detected</div>
                <div className="text-xs text-yellow-400">12 min ago</div>
              </div>

              {/* Pending Approvals if any */}
              {approvalQueue.filter(i => i.status === 'pending').length > 0 && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs font-medium text-orange-400 mb-2">Pending Approvals</div>
                    {approvalQueue.filter(i => i.status === 'pending').slice(0, 1).map((item) => (
                      <div key={item.id} className="p-2 bg-orange-400/10 rounded-lg">
                        <div className="text-xs font-medium mb-2 line-clamp-2">{item.summary}</div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-5 px-2 text-xs"
                            onClick={() => handleApprovalAction(item.id, 'approve')}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 px-2 text-xs"
                            onClick={() => handleApprovalAction(item.id, 'reject')}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Console */}
      <div className="mt-8">
        <ChatConsole
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
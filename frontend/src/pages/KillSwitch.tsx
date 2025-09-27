import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Power, 
  AlertTriangle, 
  Shield, 
  Clock,
  Cpu,
  Activity,
  StopCircle,
  Bell,
  Wifi
} from "lucide-react";
import { DeviceEntity } from "@/types";
import { mockDevices } from "@/services/mockData";

const KillSwitch = () => {
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const emergencyControlsRef = useRef<HTMLDivElement>(null);
  const systemStatusRef = useRef<HTMLDivElement>(null);
  
  const [devices] = useState<DeviceEntity[]>(mockDevices);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [autoRecovery, setAutoRecovery] = useState(true);
  const [recoveryTime, setRecoveryTime] = useState(5); // minutes

  const [systemStatus, setSystemStatus] = useState({
    aiAssistant: true,
    automation: true,
    voiceControl: true,
    remoteAccess: true,
    scheduling: true,
    notifications: true
  });

  const handleKillSwitch = async () => {
    if (!killSwitchActive) {
      // Activate kill switch
      setKillSwitchActive(true);
      
      // Disable all systems
      setSystemStatus({
        aiAssistant: false,
        automation: false,
        voiceControl: false,
        remoteAccess: false,
        scheduling: false,
        notifications: false
      });

      // If auto-recovery is enabled, set timer
      if (autoRecovery) {
        setTimeout(() => {
          handleReactivate();
        }, recoveryTime * 60 * 1000);
      }
    } else {
      handleReactivate();
    }
  };

  const handleReactivate = () => {
    setKillSwitchActive(false);
    setEmergencyMode(false);
    
    // Reactivate all systems
    setSystemStatus({
      aiAssistant: true,
      automation: true,
      voiceControl: true,
      remoteAccess: true,
      scheduling: true,
      notifications: true
    });
  };

  const handleEmergencyStop = () => {
    setEmergencyMode(true);
    setKillSwitchActive(true);
    
    // Turn off all critical devices
    // In real implementation, this would send commands to all devices
    console.log('Emergency stop activated - all devices shutting down');
    
    setSystemStatus({
      aiAssistant: false,
      automation: false,
      voiceControl: false,
      remoteAccess: false,
      scheduling: false,
      notifications: false
    });
  };

  const activeDevices = devices.filter(d => d.state).length;
  const criticalDevices = devices.filter(d => 
    d.id.includes('climate') || 
    d.id.includes('security') || 
    d.id.includes('garage')
  ).length;

  // Animate elements on mount
  useEffect(() => {
    const elements = [
      headerRef.current,
      emergencyControlsRef.current,
      systemStatusRef.current
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
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Kill Switch</h1>
          <p className="text-sm text-muted-foreground">Emergency system control and safety override</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={killSwitchActive ? "destructive" : "secondary"} className="text-xs">
            {killSwitchActive ? "SYSTEMS DISABLED" : "SYSTEMS ACTIVE"}
          </Badge>
          {emergencyMode && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              EMERGENCY MODE
            </Badge>
          )}
        </div>
      </div>

      {/* Emergency Controls */}
      <div ref={emergencyControlsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Kill Switch */}
        <Card className={`border-2 ${killSwitchActive ? 'border-destructive bg-destructive/5' : 'border-card-border bg-gradient-card'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className={`h-6 w-6 ${killSwitchActive ? 'text-destructive' : 'text-primary'}`} />
              Main Kill Switch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Instantly disable all AI automation, voice control, and remote access. 
              Manual device control will remain available.
            </p>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-base font-medium">
                  {killSwitchActive ? "Reactivate Systems" : "Disable All Systems"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {killSwitchActive ? "Restore normal operation" : "Emergency shutdown"}
                </p>
              </div>
              <Button
                variant={killSwitchActive ? "default" : "destructive"}
                size="lg"
                onClick={handleKillSwitch}
                className="min-w-[100px]"
              >
                {killSwitchActive ? (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Reactivate
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Kill Switch
                  </>
                )}
              </Button>
            </div>

            {/* Auto Recovery */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Auto Recovery</Label>
                <Switch
                  checked={autoRecovery}
                  onCheckedChange={setAutoRecovery}
                  disabled={killSwitchActive}
                />
              </div>
              {autoRecovery && (
                <p className="text-xs text-muted-foreground">
                  Systems will automatically reactivate after {recoveryTime} minutes
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Stop */}
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Emergency Stop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Immediately shut down ALL devices and systems. Use only in true emergencies.
              This cannot be undone automatically.
            </p>
            
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  WARNING: This will affect all connected devices
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Climate control systems</li>
                <li>• Security cameras and locks</li>
                <li>• All lighting and electrical devices</li>
                <li>• Network connectivity</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEmergencyStop}
              disabled={emergencyMode}
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {emergencyMode ? "EMERGENCY ACTIVE" : "EMERGENCY STOP"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div ref={systemStatusRef}>
        <Card className="bg-gradient-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(systemStatus).map(([system, active]) => (
              <div key={system} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-sm capitalize">{system.replace(/([A-Z])/g, ' $1')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {active ? "Online" : "Offline"}
                  </p>
                </div>
                <div className={`h-2 w-2 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
            ))}
          </div>
        </CardContent>
        </Card>

        {/* Device Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4 text-center">
            <Cpu className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{activeDevices}</div>
            <div className="text-sm text-muted-foreground">Active Devices</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{criticalDevices}</div>
            <div className="text-sm text-muted-foreground">Critical Systems</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">
              {killSwitchActive ? "DISABLED" : "00:00"}
            </div>
            <div className="text-sm text-muted-foreground">
              {killSwitchActive ? "Uptime" : "System Uptime"}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Recovery Actions */}
        {killSwitchActive && (
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recovery Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Systems are currently disabled. Choose how to proceed:
            </p>
            
            <div className="flex gap-3">
              <Button variant="default" onClick={handleReactivate}>
                <Activity className="h-4 w-4 mr-2" />
                Full Reactivation
              </Button>
              
              <Button variant="outline" onClick={() => {
                setSystemStatus(prev => ({ ...prev, notifications: true }));
              }}>
                <Bell className="h-4 w-4 mr-2" />
                Restore Notifications Only
              </Button>
              
              <Button variant="outline" onClick={() => {
                setSystemStatus(prev => ({ ...prev, remoteAccess: true }));
              }}>
                <Wifi className="h-4 w-4 mr-2" />
                Enable Remote Access
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default KillSwitch;
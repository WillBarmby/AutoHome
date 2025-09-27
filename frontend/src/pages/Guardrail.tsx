import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  Settings, 
  Save,
  RotateCcw
} from "lucide-react";
import { DeviceEntity } from "@/types";
import { mockDevices } from "@/services/mockData";

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
  const [devices] = useState<DeviceEntity[]>(mockDevices);
  const [guardrails, setGuardrails] = useState<GuardrailSettings[]>(
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

  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guardrails</h1>
          <p className="text-sm text-muted-foreground">Configure safety limits and restrictions</p>
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
      <Card className="bg-gradient-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
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

      {/* Device Guardrails */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Device-Specific Rules</h2>
        
        {guardrails.map((guardrail) => (
          <Card key={guardrail.deviceId} className="bg-gradient-card border-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{guardrail.deviceName}</CardTitle>
                <div className="flex items-center gap-2">
                  {guardrail.requireConfirmation && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      High Security
                    </Badge>
                  )}
                  <Switch
                    checked={guardrail.enabled}
                    onCheckedChange={(checked) => 
                      updateGuardrail(guardrail.deviceId, { enabled: checked })
                    }
                  />
                </div>
              </div>
            </CardHeader>
            
            {guardrail.enabled && (
              <CardContent className="space-y-4">
                {/* Value Limits */}
                {(guardrail.minValue !== undefined && guardrail.maxValue !== undefined) && (
                  <div className="space-y-2">
                    <Label className="text-sm">Value Limits</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          value={guardrail.minValue}
                          onChange={(e) => 
                            updateGuardrail(guardrail.deviceId, { 
                              minValue: parseInt(e.target.value) 
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          value={guardrail.maxValue}
                          onChange={(e) => 
                            updateGuardrail(guardrail.deviceId, { 
                              maxValue: parseInt(e.target.value) 
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                        value={guardrail.quietHoursStart}
                        onChange={(e) => 
                          updateGuardrail(guardrail.deviceId, { 
                            quietHoursStart: parseInt(e.target.value) 
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={guardrail.quietHoursEnd}
                        onChange={(e) => 
                          updateGuardrail(guardrail.deviceId, { 
                            quietHoursEnd: parseInt(e.target.value) 
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Rate Limiting */}
                <div className="space-y-2">
                  <Label className="text-sm">Max Actions per Hour: {guardrail.maxActionsPerHour}</Label>
                  <Slider
                    value={[guardrail.maxActionsPerHour]}
                    onValueChange={([value]) => 
                      updateGuardrail(guardrail.deviceId, { maxActionsPerHour: value })
                    }
                    max={20}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                </div>

                {/* Confirmation Required */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Require Confirmation</Label>
                  <Switch
                    checked={guardrail.requireConfirmation}
                    onCheckedChange={(checked) => 
                      updateGuardrail(guardrail.deviceId, { requireConfirmation: checked })
                    }
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
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
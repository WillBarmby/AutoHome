import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Power, 
  Lightbulb, 
  Coffee, 
  Fan, 
  Camera, 
  DoorOpen,
  Thermometer,
  Shield,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceEntity, ClimateEntity } from "@/types";

const iconMap = {
  Thermometer,
  Coffee,
  Fan,
  Lightbulb,
  Camera,
  Garage: DoorOpen,
  Power
};

interface DeviceCardProps {
  device: DeviceEntity;
  onToggle?: (deviceId: string) => void;
  onLevelChange?: (deviceId: string, level: number) => void;
}

export function DeviceCard({ device, onToggle, onLevelChange }: DeviceCardProps) {
  const Icon = iconMap[device.icon as keyof typeof iconMap] || Power;
  
  const isOn = typeof device.state === 'boolean' ? device.state : !!device.state;
  const level = typeof device.state === 'number' ? device.state : 
                device.attributes?.brightness || device.attributes?.percentage || 0;
  
  const handleToggle = () => {
    if (device.id === 'cover.garage') {
      // Garage door requires confirmation - this would trigger approval queue
      console.log('Garage door toggle requires confirmation');
      return;
    }
    onToggle?.(device.id);
  };

  const handleLevelChange = (value: number[]) => {
    onLevelChange?.(device.id, value[0]);
  };

  const getStateDisplay = () => {
    if (device.type === 'climate') {
      const climate = device as ClimateEntity;
      return `${climate.attributes.current_temperature}°F → ${climate.attributes.target_temperature}°F`;
    }
    
    if (device.type === 'light' && isOn) {
      return `${Math.round((level / 255) * 100)}%`;
    }
    
    if (device.type === 'fan' && isOn) {
      return `${level}%`;
    }
    
    if (device.type === 'camera') {
      return device.attributes.privacy ? 'Privacy On' : 'Streaming';
    }
    
    return isOn ? 'On' : 'Off';
  };

  const requiresConfirmation = device.id === 'cover.garage' || device.id === 'camera.front_door';

  return (
    <Card className="bg-gradient-card border-card-border shadow-card hover:shadow-glow transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-full transition-colors",
              isOn 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            
            <div>
              <h3 className="font-medium text-foreground">{device.name}</h3>
              <p className="text-sm text-muted-foreground">
                {device.room || device.type}
              </p>
            </div>
          </div>

          {requiresConfirmation && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Confirm
            </Badge>
          )}
          
          {!device.available && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={cn(
              "text-sm font-medium",
              isOn ? "text-primary" : "text-muted-foreground"
            )}>
              {getStateDisplay()}
            </span>
          </div>

          {(device.type === 'light' || device.type === 'fan') && isOn && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {device.type === 'light' ? 'Brightness' : 'Speed'}
                </span>
                <span className="text-foreground">{Math.round((level / 255) * 100)}%</span>
              </div>
              <Slider
                value={[level]}
                onValueChange={handleLevelChange}
                max={255}
                step={1}
                className="w-full"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant={isOn ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              className="flex-1"
              disabled={!device.available}
            >
              {device.type === 'cover' 
                ? (device.state === 'closed' ? 'Open' : 'Close')
                : (isOn ? 'Turn Off' : 'Turn On')
              }
            </Button>
            
            {device.type === 'climate' && (
              <Button variant="outline" size="sm">
                Adjust
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
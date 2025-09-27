import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Droplets, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit: string;
  subtitle?: string;
  progress?: number;
  variant?: 'default' | 'temperature' | 'humidity' | 'energy';
}

function VitalMetric({ icon: Icon, label, value, unit, subtitle, progress, variant = 'default' }: VitalMetricProps) {
  const progressValue = progress || 0;
  
  const getProgressColor = () => {
    switch (variant) {
      case 'temperature': return 'stroke-blue-400';
      case 'humidity': return 'stroke-cyan-400'; 
      case 'energy': return 'stroke-primary';
      default: return 'stroke-primary';
    }
  };

  return (
    <div className="relative flex flex-col items-center p-4">
      <div className="relative mb-3">
        {/* Progress circle */}
        <svg className="h-16 w-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className={cn("transition-all duration-1000", getProgressColor())}
            strokeDasharray={`${progressValue * 1.76} 176`}
          />
        </svg>
        
        {/* Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-6 w-6 text-foreground" />
        </div>
      </div>
      
      <div className="text-center">
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-xl font-bold text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

interface VitalsCardProps {
  temperature: { current: number; target: number; outside: number; deltaT: number };
  humidity: number;
  energyCost: { current: number; daily: number };
}

export function VitalsCard({ temperature, humidity, energyCost }: VitalsCardProps) {
  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardContent className="p-6">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <VitalMetric
            icon={Thermometer}
            label="Temperature"
            value={temperature.current}
            unit="°F"
            subtitle={`Target: ${temperature.target}°F`}
            progress={Math.min(temperature.current / 100, 1)}
            variant="temperature"
          />
          
          <VitalMetric
            icon={Droplets}
            label="Humidity"
            value={humidity}
            unit="%"
            subtitle={humidity < 40 ? "Dry" : humidity > 60 ? "Humid" : "Comfortable"}
            progress={humidity / 100}
            variant="humidity"
          />
          
          <VitalMetric
            icon={Zap}
            label="Energy Cost"
            value={energyCost.current}
            unit="¢/kWh"
            subtitle={`$${energyCost.daily.toFixed(2)} today`}
            progress={Math.min(energyCost.current / 50, 1)}
            variant="energy"
          />
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Outside Temperature</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{temperature.outside}°F</span>
              <span className="text-xs text-muted-foreground">
                (Δ{temperature.deltaT}°F)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
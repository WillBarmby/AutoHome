import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Hand, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationMode } from "@/types";

interface OperationModeToggleProps {
  mode: OperationMode;
  onModeChange: (mode: OperationMode) => void;
  pendingApprovals?: number;
}

export function OperationModeToggle({ mode, onModeChange, pendingApprovals = 0 }: OperationModeToggleProps) {
  const modes: { 
    key: OperationMode; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    description: string;
    color: string;
  }[] = [
    {
      key: 'auto',
      label: 'Auto (Safe)',
      icon: Zap,
      description: 'Safe actions execute automatically',
      color: 'bg-primary/20 text-primary border-primary/30'
    },
    {
      key: 'manual',
      label: 'Manual',
      icon: Hand,
      description: 'All actions require approval',
      color: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    },
    {
      key: 'paused',
      label: 'Paused',
      icon: Pause,
      description: 'All automation disabled',
      color: 'bg-destructive/20 text-destructive border-destructive/30'
    }
  ];

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Operation Mode</h3>
          {pendingApprovals > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              {pendingApprovals} pending
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {modes.map((modeConfig) => {
            const Icon = modeConfig.icon;
            const isActive = mode === modeConfig.key;
            
            return (
              <Button
                key={modeConfig.key}
                variant={isActive ? "outline" : "ghost"}
                onClick={() => onModeChange(modeConfig.key)}
                className={cn(
                  "flex flex-col items-center p-4 h-auto gap-2 transition-all duration-200",
                  isActive 
                    ? cn("border-2", modeConfig.color, "hover:bg-transparent hover:text-current hover:border-current pointer-events-none")
                    : "border-2 border-transparent hover:bg-primary/10 hover:border-primary/20 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">{modeConfig.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {modeConfig.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Status</span>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                mode === 'auto' ? "bg-primary" : 
                mode === 'manual' ? "bg-amber-500" : "bg-destructive"
              )} />
              <span className="font-medium capitalize">{mode}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { cn } from "@/lib/utils";

interface CircularMeterProps {
  value: number;
  max: number;
  unit: string;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  onToggle?: () => void;
  onIncrease?: () => void;
  onDecrease?: () => void;
  isActive?: boolean;
  className?: string;
}

export function CircularMeter({
  value,
  max,
  unit,
  label,
  color = "primary",
  size = "md",
  showControls = false,
  onToggle,
  onIncrease,
  onDecrease,
  isActive = false,
  className
}: CircularMeterProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizes = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const getColorClass = (colorName: string) => {
    switch (colorName) {
      case 'primary': return 'text-primary';
      case 'accent': return 'text-accent';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-primary';
    }
  };

  const getStrokeColor = (colorName: string) => {
    switch (colorName) {
      case 'primary': return 'hsl(var(--primary))';
      case 'accent': return 'hsl(var(--accent))';
      case 'warning': return 'hsl(45, 100%, 60%)';
      case 'success': return 'hsl(140, 100%, 60%)';
      default: return 'hsl(var(--primary))';
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className={cn("relative", sizes[size])}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getStrokeColor(color)}
            strokeWidth="4"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out drop-shadow-glow"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn("font-bold", textSizes[size], getColorClass(color))}>
            {typeof value === 'number' ? value.toFixed(1) : value}
          </div>
          <div className="text-xs text-muted-foreground">{unit}</div>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {isActive !== undefined && (
          <div className={cn(
            "text-xs mt-1",
            isActive ? "text-green-400" : "text-muted-foreground"
          )}>
            {isActive ? "ON" : "OFF"}
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center space-x-4">
          {onDecrease && (
            <button
              onClick={onDecrease}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-foreground transition-colors"
            >
              -
            </button>
          )}
          
          {onToggle && (
            <button
              onClick={onToggle}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {isActive ? "ON" : "OFF"}
            </button>
          )}
          
          {onIncrease && (
            <button
              onClick={onIncrease}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-foreground transition-colors"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}
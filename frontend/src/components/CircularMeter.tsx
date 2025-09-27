import { cn } from "@/lib/utils";
import React, { useState, useRef, useCallback, useEffect } from "react";


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
  onValueChange?: (value: number) => void;
  isActive?: boolean;
  className?: string;
  decimalPlaces?: number;
  useCircularSlider?: boolean;
  min?: number;
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
  onValueChange,
  isActive = false,
  className,
  decimalPlaces = 1,
  useCircularSlider = false,
  min = 0
}: CircularMeterProps) {
  const [isHolding, setIsHolding] = useState<'increase' | 'decrease' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);


  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Circular slider functionality
  const radius = 45;
  const centerX = 50;
  const centerY = 50;

  // Convert value to angle (0 to 270 degrees, starting from bottom)
  const valueToAngle = (val: number) => {
    const normalized = (val - min) / (max - min);
    return normalized * 270; // 270 degrees for 3/4 circle
  };

  // Convert angle to value
  const angleToValue = (angle: number) => {
    const normalized = angle / 270;
    return min + normalized * (max - min);
  };

  // Get point on circle from angle
  const getPointOnCircle = (angle: number) => {
    const radian = ((angle - 90) * Math.PI) / 180; // Start from top, go clockwise
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian)
    };
  };

  const currentAngle = useCircularSlider ? valueToAngle(value) : 0;
  const handlePos = getPointOnCircle(currentAngle);

  // Calculate arc path for slider
  const getArcPath = (startAngle: number, endAngle: number) => {
    const start = getPointOnCircle(startAngle);
    const end = getPointOnCircle(endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Helper function to calculate value from mouse position
  const calculateValueFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = clientX - centerX;
    const y = clientY - centerY;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;
    
    if (angle > 270) {
      angle = angle > 315 ? 0 : 270;
    }
    
    return angleToValue(angle);
  }, [angleToValue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!useCircularSlider || !onValueChange) return;
    
    // Immediately set value at click position
    const newValue = calculateValueFromPosition(e.clientX, e.clientY);
    if (newValue !== null) {
      onValueChange(Math.round(newValue * 10) / 10);
    }
    
    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!useCircularSlider || !onValueChange) return;
    
    const touch = e.touches[0];
    if (touch) {
      // Immediately set value at touch position
      const newValue = calculateValueFromPosition(touch.clientX, touch.clientY);
      if (newValue !== null) {
        onValueChange(Math.round(newValue * 10) / 10);
      }
    }
    
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !useCircularSlider || !onValueChange) return;

    const newValue = calculateValueFromPosition(e.clientX, e.clientY);
    if (newValue !== null) {
      onValueChange(Math.round(newValue * 10) / 10);
    }
  }, [isDragging, onValueChange, useCircularSlider, calculateValueFromPosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !useCircularSlider || !onValueChange) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    const newValue = calculateValueFromPosition(touch.clientX, touch.clientY);
    if (newValue !== null) {
      onValueChange(Math.round(newValue * 10) / 10);
    }
  }, [isDragging, onValueChange, useCircularSlider, calculateValueFromPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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

  // Hold-down functionality
  const startHolding = useCallback((type: 'increase' | 'decrease') => {
    setIsHolding(type);
    
    // Initial delay before starting continuous changes
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (type === 'increase' && onIncrease) {
          onIncrease();
        } else if (type === 'decrease' && onDecrease) {
          onDecrease();
        }
      }, 100); // Change every 100ms
    }, 500); // Wait 500ms before starting continuous changes
  }, [onIncrease, onDecrease]);

  const stopHolding = useCallback(() => {
    setIsHolding(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className={cn("relative", sizes[size])}>
        <svg 
          ref={svgRef}
          className={cn(
            "w-full h-full transform -rotate-90",
            useCircularSlider ? "cursor-pointer" : ""
          )}
          viewBox="0 0 100 100"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
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
          
          {/* Progress circle or slider arc */}
          {useCircularSlider ? (
            <>
              {/* Slider track - full range */}
              <path
                d={getArcPath(0, 270)}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-muted/40"
              />
              {/* Active slider arc */}
              <path
                d={getArcPath(0, currentAngle)}
                fill="none"
                stroke={getStrokeColor(color)}
                strokeWidth="4"
                strokeLinecap="round"
                className="transition-all duration-300 ease-out drop-shadow-glow"
              />
              {/* Handle */}
              <circle
                cx={handlePos.x}
                cy={handlePos.y}
                r="8"
                fill={getStrokeColor(color)}
                className={cn(
                  "cursor-grab active:cursor-grabbing drop-shadow-glow transition-all duration-200",
                  isDragging ? "scale-110" : "hover:scale-105"
                )}
                stroke="white"
                strokeWidth="2"
              />
            </>
          ) : (
            /* Regular progress circle */
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
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn("font-bold", textSizes[size], getColorClass(color))}>
            {typeof value === 'number' ? value.toFixed(decimalPlaces) : value}
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
      {showControls && !useCircularSlider && (
        <div className="flex items-center space-x-4">
          {onDecrease && (
            <button
              onClick={onDecrease}
              onMouseDown={(e) => {
                e.preventDefault();
                startHolding('decrease');
              }}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={(e) => {
                e.preventDefault();
                startHolding('decrease');
              }}
              onTouchEnd={stopHolding}
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
              onMouseDown={(e) => {
                e.preventDefault();
                startHolding('increase');
              }}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={(e) => {
                e.preventDefault();
                startHolding('increase');
              }}
              onTouchEnd={stopHolding}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-foreground transition-colors"
            >
              +
            </button>
          )}
        </div>
      )}

      {/* Toggle button for circular slider */}
      {showControls && useCircularSlider && onToggle && (
        <div className="flex justify-center">
          <button
            onClick={onToggle}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {isActive ? "ON" : "OFF"}
          </button>
        </div>
      )}
    </div>
  );
}
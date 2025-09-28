import React from 'react';
import { cn } from '@/lib/utils';

// Removed Mobiscroll CSS imports since we're using native select elements

interface WheelTimePickerProps {
  value: string; // "7:15 AM" format
  onChange: (value: string) => void;
  className?: string;
}

export function WheelTimePicker({ value, onChange, className }: WheelTimePickerProps) {
  const [hour, setHour] = React.useState(12);
  const [minute, setMinute] = React.useState(0);
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM');
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Parse initial value only once
  React.useEffect(() => {
    if (!isInitialized) {
      const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
      if (match) {
        setHour(parseInt(match[1]));
        setMinute(parseInt(match[2]));
        setPeriod(match[3] as 'AM' | 'PM');
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Emit change when values update (but not on initial load)
  React.useEffect(() => {
    if (isInitialized) {
      const formattedHour = hour.toString();
      const formattedMinute = minute.toString().padStart(2, '0');
      const newValue = `${formattedHour}:${formattedMinute} ${period}`;
      onChange(newValue);
    }
  }, [hour, minute, period, isInitialized]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  return (
    <div className={cn("flex items-center space-x-2 p-4 bg-muted/20 rounded-lg", className)}>
      {/* Hour selector */}
      <div className="flex-1 h-32 overflow-hidden relative">
        <select
          value={hour}
          onChange={(e) => setHour(parseInt(e.target.value))}
          className="w-full h-full text-center text-lg font-medium bg-transparent border-none outline-none cursor-pointer text-foreground"
        >
          {hours.map(h => (
            <option key={h} value={h} className="bg-background text-foreground">{h}</option>
          ))}
        </select>
      </div>
      
      <div className="text-muted-foreground text-lg font-bold">:</div>
      
      {/* Minute selector */}
      <div className="flex-1 h-32 overflow-hidden relative">
        <select
          value={minute}
          onChange={(e) => setMinute(parseInt(e.target.value))}
          className="w-full h-full text-center text-lg font-medium bg-transparent border-none outline-none cursor-pointer text-foreground"
        >
          {minutes.map(m => (
            <option key={m} value={m} className="bg-background text-foreground">{m.toString().padStart(2, '0')}</option>
          ))}
        </select>
      </div>
      
      {/* Period selector */}
      <div className="flex-1 h-32 overflow-hidden relative">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'AM' | 'PM')}
          className="w-full h-full text-center text-lg font-medium bg-transparent border-none outline-none cursor-pointer text-foreground"
        >
          {periods.map(p => (
            <option key={p} value={p} className="bg-background text-foreground">{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

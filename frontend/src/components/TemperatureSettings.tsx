import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChevronUp, ChevronDown, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';

interface TemperatureSettingsProps {
  awakeTemp: number;
  sleepTemp: number;
  onAwakeTempChange: (temp: number) => void;
  onSleepTempChange: (temp: number) => void;
  className?: string;
}

export interface TemperatureSettingsRef {
  syncToForm: () => void;
}

const TemperatureSettings = forwardRef<TemperatureSettingsRef, TemperatureSettingsProps>(({
  awakeTemp,
  sleepTemp,
  onAwakeTempChange,
  onSleepTempChange,
  className
}, ref) => {
  const [localAwakeTemp, setLocalAwakeTemp] = useState(awakeTemp);
  const [localSleepTemp, setLocalSleepTemp] = useState(sleepTemp);

  // Update local state when props change
  useEffect(() => {
    setLocalAwakeTemp(awakeTemp);
  }, [awakeTemp]);

  useEffect(() => {
    setLocalSleepTemp(sleepTemp);
  }, [sleepTemp]);

  const adjustTemp = (currentTemp: number, delta: number, setter: (temp: number) => void, onChange: (temp: number) => void) => {
    const newTemp = Math.min(Math.max(currentTemp + delta, 60), 80);
    setter(newTemp);
    onChange(newTemp);
  };

  const syncToForm = () => {
    onAwakeTempChange(localAwakeTemp);
    onSleepTempChange(localSleepTemp);
  };

  useImperativeHandle(ref, () => ({
    syncToForm
  }));

  return (
    <div className={cn("bg-green-600/20 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 flex flex-col items-center justify-center", className)}>
      <h3 className="text-white text-center text-xl font-medium mb-6">Temperature Settings</h3>
      
      <div className="grid grid-cols-2 gap-6 w-full relative">
        {/* Divider */}
        <div className="absolute left-1/2 top-8 bottom-8 w-px bg-white/10 transform -translate-x-1/2"></div>
        
        {/* When Awake */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center gap-2 text-white text-sm mb-3">
            <Sun className="w-4 h-4" />
            <span>when awake</span>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-baseline w-[140px] justify-center">
              <span className="text-white text-8xl font-bold">
                <NumberFlow 
                  value={localAwakeTemp} 
                  duration={400}
                  ease="easeOut"
                />
              </span>
              <span className="text-white text-2xl ml-2">°F</span>
            </div>
            <div className="flex flex-col ml-4">
              <button
                type="button"
                onClick={() => adjustTemp(localAwakeTemp, 0.1, setLocalAwakeTemp, onAwakeTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(localAwakeTemp, -0.1, setLocalAwakeTemp, onAwakeTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* When Sleeping */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center gap-2 text-white text-sm mb-3">
            <Moon className="w-4 h-4" />
            <span>when sleeping</span>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-baseline w-[140px] justify-center">
              <span className="text-white text-8xl font-bold">
                <NumberFlow 
                  value={localSleepTemp} 
                  duration={400}
                  ease="easeOut"
                />
              </span>
              <span className="text-white text-2xl ml-2">°F</span>
            </div>
            <div className="flex flex-col ml-4">
              <button
                type="button"
                onClick={() => adjustTemp(localSleepTemp, 0.1, setLocalSleepTemp, onSleepTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(localSleepTemp, -0.1, setLocalSleepTemp, onSleepTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TemperatureSettings.displayName = 'TemperatureSettings';

export { TemperatureSettings };
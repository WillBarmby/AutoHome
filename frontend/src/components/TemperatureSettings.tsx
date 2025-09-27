import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className={cn("bg-green-600 rounded-lg p-6 flex flex-col items-center justify-center", className)}>
      <h3 className="text-white text-center text-xl font-medium mb-6">Temperature Settings</h3>
      
      <div className="grid grid-cols-2 gap-6 w-full">
        {/* When Awake */}
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-white text-sm mb-3">when awake</p>
          <div className="flex items-center justify-center">
            <div className="flex items-baseline w-[140px] justify-center">
              <span className="text-white text-8xl font-bold">{localAwakeTemp}</span>
              <span className="text-white text-2xl ml-2">°F</span>
            </div>
            <div className="flex flex-col ml-4">
              <button
                type="button"
                onClick={() => adjustTemp(localAwakeTemp, 1, setLocalAwakeTemp, onAwakeTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(localAwakeTemp, -1, setLocalAwakeTemp, onAwakeTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* When Sleeping */}
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-white text-sm mb-3">when sleeping</p>
          <div className="flex items-center justify-center">
            <div className="flex items-baseline w-[140px] justify-center">
              <span className="text-white text-8xl font-bold">{localSleepTemp}</span>
              <span className="text-white text-2xl ml-2">°F</span>
            </div>
            <div className="flex flex-col ml-4">
              <button
                type="button"
                onClick={() => adjustTemp(localSleepTemp, 1, setLocalSleepTemp, onSleepTempChange)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-green-700 rounded transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(localSleepTemp, -1, setLocalSleepTemp, onSleepTempChange)}
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
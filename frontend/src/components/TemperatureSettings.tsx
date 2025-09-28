import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChevronUp, ChevronDown, Sun, Moon, Save, RotateCcw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { Button } from '@/components/ui/button';

interface TemperatureSettingsProps {
  awakeTemp: number;
  sleepTemp: number;
  onAwakeTempChange: (temp: number) => void;
  onSleepTempChange: (temp: number) => void;
  onSave?: () => void;
  onReset?: () => void;
  onLoadExample?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
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
  onSave,
  onReset,
  onLoadExample,
  isSaving = false,
  hasUnsavedChanges = false,
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
    <div className={cn("w-full bg-green-600/10 backdrop-blur-md border border-green-500/20 rounded-lg p-6 flex flex-col items-center justify-center", className)}>
      <h3 className="text-white text-center text-xl font-medium mb-6">Comfort Temperatures</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative">
        {/* Divider */}
        <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-white/10 transform -translate-x-1/2"></div>
        
        {/* When Awake */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center gap-2 text-white text-sm mb-3">
            <Sun className="w-4 h-4" />
            <span>while I'm up</span>
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
          <div className="flex items-center gap-2 text-white text-sm mb-3">
            <Moon className="w-4 h-4" />
            <span>overnight</span>
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
      
      {/* Action Buttons */}
      {(onSave || onReset || onLoadExample) && (
        <div className="flex gap-3 mt-6">
          {onSave && (
            <Button 
              type="button"
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
          {onReset && (
            <Button 
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isSaving}
              className="flex-1 border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset all
            </Button>
          )}
          {onLoadExample && (
            <Button 
              type="button"
              variant="outline"
              onClick={onLoadExample}
              disabled={isSaving}
              className="flex-1 border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Load example
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

TemperatureSettings.displayName = 'TemperatureSettings';

export { TemperatureSettings };

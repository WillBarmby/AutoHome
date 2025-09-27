import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfile, UserProfileSchema, defaultUserProfile } from '@/types/userProfile';
import { WheelTimePicker } from '@/components/WheelTimePicker';
import { TemperatureSettings, TemperatureSettingsRef } from '@/components/TemperatureSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { gsap } from 'gsap';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const temperatureSettingsRef = useRef<TemperatureSettingsRef>(null);

  // Load user profile synchronously
  const getInitialProfile = (): UserProfile => {
    try {
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultUserProfile, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
    return defaultUserProfile;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty }
  } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: getInitialProfile()
  });

  const watchedValues = watch();

  // GSAP animations
  useEffect(() => {
    const elements = [headerRef.current, formRef.current, previewRef.current].filter(Boolean);
    
    if (elements.length > 0) {
      gsap.fromTo(elements, 
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.15, 
          ease: 'power2.out' 
        }
      );
    }
  }, []);

  // Set last updated timestamp on mount
  useEffect(() => {
    const profile = getInitialProfile();
    setLastUpdated(profile.updatedAt || '');
  }, []);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  const onSubmit = async (data: UserProfile) => {
    // Sync temperature settings to form before saving
    temperatureSettingsRef.current?.syncToForm();
    
    // Get the updated form data after syncing
    const updatedData = getValues();
    
    setIsSaving(true);
    try {
      const profileWithTimestamp = {
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('userProfile', JSON.stringify(profileWithTimestamp));
      setLastUpdated(profileWithTimestamp.updatedAt);
      setHasUnsavedChanges(false);
      reset(updatedData);
      
      toast({
        title: "Success",
        description: "Preferences saved successfully",
      });
    } catch (error) {
      console.error('Failed to save user profile:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    reset(defaultUserProfile);
    setLastUpdated('');
    setHasUnsavedChanges(false);
  };

  const handleUseExample = () => {
    const exampleProfile: UserProfile = {
      leaveTime: "7:30 AM",
      returnTime: "5:30 PM",
      bedTime: "11:00 PM",
      wakeTime: "6:00 AM",
      tempAwakeF: 72,
      tempSleepF: 69,
      notes: "I work from home on Tuesdays and Thursdays. I prefer the house to be cooler at night for better sleep. I have a cat who likes to sleep in the living room during the day."
    };
    
    reset(exampleProfile);
    setHasUnsavedChanges(true);
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };


  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide">User Profile</h1>
          <p className="text-sm text-muted-foreground">Tell the assistant what to assume by default</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
              Unsaved Changes
            </Badge>
          )}
          {lastUpdated && (
            <Badge variant="secondary" className="text-xs">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Form */}
        <Card ref={formRef} className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="tracking-wide">Preferences</CardTitle>
            <CardDescription>
              Set your daily schedule and temperature preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Time Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveTime">What time do you usually leave?</Label>
                  <WheelTimePicker
                    value={watchedValues.leaveTime}
                    onChange={(value) => setValue('leaveTime', value, { shouldDirty: true })}
                  />
                  {errors.leaveTime && (
                    <p className="text-sm text-red-500">{errors.leaveTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnTime">When are you usually back?</Label>
                  <WheelTimePicker
                    value={watchedValues.returnTime}
                    onChange={(value) => setValue('returnTime', value, { shouldDirty: true })}
                  />
                  {errors.returnTime && (
                    <p className="text-sm text-red-500">{errors.returnTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedTime">What time do you usually go to bed?</Label>
                  <WheelTimePicker
                    value={watchedValues.bedTime}
                    onChange={(value) => setValue('bedTime', value, { shouldDirty: true })}
                  />
                  {errors.bedTime && (
                    <p className="text-sm text-red-500">{errors.bedTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wakeTime">What time do you usually wake up?</Label>
                  <WheelTimePicker
                    value={watchedValues.wakeTime}
                    onChange={(value) => setValue('wakeTime', value, { shouldDirty: true })}
                  />
                  {errors.wakeTime && (
                    <p className="text-sm text-red-500">{errors.wakeTime.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Temperature Settings and Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Temperature Settings */}
                <TemperatureSettings
                  ref={temperatureSettingsRef}
                  awakeTemp={watchedValues.tempAwakeF}
                  sleepTemp={watchedValues.tempSleepF}
                  onAwakeTempChange={(temp) => {
                    setValue('tempAwakeF', temp, { shouldDirty: true });
                    setHasUnsavedChanges(true);
                  }}
                  onSleepTempChange={(temp) => {
                    setValue('tempSleepF', temp, { shouldDirty: true });
                    setHasUnsavedChanges(true);
                  }}
                />

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Notes</h3>
                  <div className="space-y-2">
                    <Textarea
                      id="notes"
                      placeholder="Things the model should know about your preferences, schedule, or home..."
                      rows={6}
                      maxLength={2000}
                      {...register('notes', {
                        onChange: () => setHasUnsavedChanges(true)
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watchedValues.notes?.length || 0}/2000 characters
                    </p>
                    {errors.notes && (
                      <p className="text-sm text-red-500">{errors.notes.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex-1 min-w-24"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleUseExample}
                  disabled={isSaving}
                >
                  Use Example
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card ref={previewRef} className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="tracking-wide">Preview</CardTitle>
            <CardDescription>
              How the assistant will interpret your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Today's Schedule:</p>
                <p>
                  I'll leave at <span className="font-semibold text-primary">{formatTime(watchedValues.leaveTime)}</span>, 
                  back at <span className="font-semibold text-primary">{formatTime(watchedValues.returnTime)}</span>
                </p>
              </div>
              
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Sleep Schedule:</p>
                <p>
                  I go to bed at <span className="font-semibold text-primary">{formatTime(watchedValues.bedTime)}</span>, 
                  wake up at <span className="font-semibold text-primary">{formatTime(watchedValues.wakeTime)}</span>
                </p>
              </div>
              
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Temperature Settings:</p>
                <p>
                  Keep house at <span className="font-semibold text-primary">{watchedValues.tempAwakeF}°F</span> when awake, 
                  <span className="font-semibold text-primary"> {watchedValues.tempSleepF}°F</span> when sleeping
                </p>
              </div>

              {watchedValues.notes && (
                <div className="p-4 bg-muted/20 rounded-lg md:col-span-2 lg:col-span-3">
                  <p className="font-medium mb-2">Additional Context:</p>
                  <p className="text-muted-foreground">{watchedValues.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

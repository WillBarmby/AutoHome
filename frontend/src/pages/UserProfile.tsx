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

export default function UserProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const temperatureSettingsRef = useRef<TemperatureSettingsRef>(null);

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
    defaultValues: defaultUserProfile
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

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { getUserProfile } = await import('@/services/userProfileService');
        const profile = await getUserProfile();
        reset(profile);
        setLastUpdated(profile.updatedAt || '');
      } catch (error) {
        console.error('Failed to load user profile:', error);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [reset, toast]);

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
      const { saveUserProfile } = await import('@/services/userProfileService');
      const savedProfile = await saveUserProfile(updatedData);
      setLastUpdated(savedProfile.updatedAt);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div ref={headerRef} className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">User Profile</h1>
            <p className="text-muted-foreground">
              Tell the assistant what to assume by default.
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                Unsaved Changes
              </Badge>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Form */}
        <Card ref={formRef}>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
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
        <Card ref={previewRef}>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
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

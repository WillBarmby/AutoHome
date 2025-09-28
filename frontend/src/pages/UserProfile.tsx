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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { gsap } from 'gsap';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import { getUserProfile, saveUserProfile } from '@/services/userProfileService';

export default function UserProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
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

  // Set last updated timestamp on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        reset(profile);
        setLastUpdated(profile.updatedAt || '');
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [reset]);

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
      const savedProfile = await saveUserProfile(updatedData);
      setLastUpdated(savedProfile.updatedAt || '');
      setHasUnsavedChanges(false);
      reset(savedProfile);
      
      toast({
        title: "Saved",
        description: "Your preferences are locked in.",
      });
    } catch (error) {
      console.error('Failed to save user profile:', error);
      toast({
        title: "Couldn't save",
        description: "Please try again in a moment.",
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
      location: "Austin",
      squareFootage: 2400,
      coolingUnits: 1,
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
      <div className="p-10 min-h-screen bg-gradient-main bg-dot-grid text-muted-foreground">
        Loading your profile…
      </div>
    );
  }

  
  return (
    <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Your Profile</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Set the defaults your assistant should assume.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Button>
          {lastUpdated && (
            <Badge variant="secondary" className="text-xs">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Form */}
        <Card ref={formRef} className="bg-gradient-card border-card-border">
          <CardHeader className="relative">
            <CardTitle className="tracking-wide">Your preferences</CardTitle>
            <CardDescription>
              Tune your day-to-day rhythm and comfort settings.
            </CardDescription>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="absolute top-4 right-4 text-orange-500 border-orange-500 text-xs">
                Unsaved changes
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Time Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveTime">When do you head out?</Label>
                  <WheelTimePicker
                    value={watchedValues.leaveTime}
                    onChange={(value) => setValue('leaveTime', value, { shouldDirty: true })}
                  />
                  {errors.leaveTime && (
                    <p className="text-sm text-red-500">{errors.leaveTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnTime">When are you back home?</Label>
                  <WheelTimePicker
                    value={watchedValues.returnTime}
                    onChange={(value) => setValue('returnTime', value, { shouldDirty: true })}
                  />
                  {errors.returnTime && (
                    <p className="text-sm text-red-500">{errors.returnTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedTime">When do you wind down?</Label>
                  <WheelTimePicker
                    value={watchedValues.bedTime}
                    onChange={(value) => setValue('bedTime', value, { shouldDirty: true })}
                  />
                  {errors.bedTime && (
                    <p className="text-sm text-red-500">{errors.bedTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wakeTime">When do you wake up?</Label>
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

              {/* Home Context */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Where's home?</Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco"
                    {...register('location', {
                      onChange: () => setHasUnsavedChanges(true)
                    })}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="squareFootage">Home size (sq. ft.)</Label>
                  <Input
                    id="squareFootage"
                    type="number"
                    min={200}
                    max={10000}
                    {...register('squareFootage', {
                      valueAsNumber: true,
                      onChange: () => setHasUnsavedChanges(true)
                    })}
                  />
                  {errors.squareFootage && (
                    <p className="text-sm text-red-500">{errors.squareFootage.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coolingUnits">HVAC units</Label>
                  <Input
                    id="coolingUnits"
                    type="number"
                    min={1}
                    max={5}
                    {...register('coolingUnits', {
                      valueAsNumber: true,
                      onChange: () => setHasUnsavedChanges(true)
                    })}
                  />
                  {errors.coolingUnits && (
                    <p className="text-sm text-red-500">{errors.coolingUnits.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Temperature Settings and Notes */}
              <div className="grid grid-cols-1 gap-6">
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
                  className="w-full max-w-3xl mx-auto"
                />

                {/* Notes UI temporarily disabled
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
                */}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex-1 min-w-24"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  Reset all
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleUseExample}
                  disabled={isSaving}
                >
                  Load example
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
              Here’s what your assistant will assume.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Daytime plan</p>
                <p>
                  Out the door at <span className="font-semibold text-primary">{formatTime(watchedValues.leaveTime)}</span>, 
                  back home by <span className="font-semibold text-primary">{formatTime(watchedValues.returnTime)}</span>
                </p>
              </div>
              
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Sleep routine</p>
                <p>
                  Lights out at <span className="font-semibold text-primary">{formatTime(watchedValues.bedTime)}</span>, 
                  up at <span className="font-semibold text-primary">{formatTime(watchedValues.wakeTime)}</span>
                </p>
              </div>
              
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Comfort temps</p>
                <p>
                  Hold steady at <span className="font-semibold text-primary">
                    <NumberFlow 
                      value={watchedValues.tempAwakeF} 
                      duration={800}
                      ease="easeOut"
                    />°F
                  </span> while I'm up, 
                  <span className="font-semibold text-primary">
                    <NumberFlow 
                      value={watchedValues.tempSleepF} 
                      duration={800}
                      ease="easeOut"
                    />°F
                  </span> overnight
                </p>
              </div>

              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="font-medium mb-2">Home snapshot</p>
                <p>
                  Based in <span className="font-semibold text-primary">{watchedValues.location}</span>, roughly
                  <span className="font-semibold text-primary"> {watchedValues.squareFootage.toLocaleString()} sq. ft.</span> with
                  <span className="font-semibold text-primary"> {watchedValues.coolingUnits}</span> HVAC unit{watchedValues.coolingUnits > 1 ? 's' : ''}.
                </p>
              </div>

              {watchedValues.notes && (
                <div className="p-4 bg-muted/20 rounded-lg md:col-span-2 lg:col-span-3">
                  <p className="font-medium mb-2">Extra context</p>
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

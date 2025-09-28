import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CircularMeter } from './CircularMeter';
import ElasticSlider from './ElasticSlider';
import { useToast } from '@/hooks/use-toast';
import { 
  Thermometer, 
  Clock, 
  Sun, 
  Cloud, 
  Zap, 
  Home,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Minus,
  Plus,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  calculateTemperature, 
  checkHAConnection, 
  getClimateEntities,
  setClimateTemperature,
  getWeather,
  type TemperatureCalculationResult,
  type HAConnectionStatus,
  type HAEntity,
  type WeatherData
} from '@/services/api';

interface SmartThermostatProps {
  className?: string;
}

export function SmartThermostat({ className }: SmartThermostatProps) {
  const [connectionStatus, setConnectionStatus] = useState<HAConnectionStatus | null>(null);
  const [climateEntities, setClimateEntities] = useState<HAEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [calculationResult, setCalculationResult] = useState<TemperatureCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [currentTemp, setCurrentTemp] = useState(75);
  const [targetTemp, setTargetTemp] = useState(72);
  const [location, setLocation] = useState('Williamsburg');
  const [squareFootage, setSquareFootage] = useState(2200);
  const [numUnits, setNumUnits] = useState(1);
  const [arrivalTime, setArrivalTime] = useState('17:00');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Check HA connection
      const connection = await checkHAConnection();
      setConnectionStatus(connection);

      if (connection.connected) {
        // Load climate entities
        const entities = await getClimateEntities();
        setClimateEntities(entities);
        if (entities.length > 0) {
          setSelectedEntity(entities[0].entity_id);
        }

        // Load weather data
        try {
          const weather = await getWeather(location);
          setWeatherData(weather);
        } catch (error) {
          console.warn('Failed to load weather data:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load Home Assistant data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const result = await calculateTemperature({
        current_temp: currentTemp,
        target_temp: targetTemp,
        location: location,
        square_footage: squareFootage,
        num_cooling_units: numUnits,
        arrival_time: arrivalTime,
        send_to_ha: true
      });

      setCalculationResult(result);

      // Update weather data
      try {
        const weather = await getWeather(location);
        setWeatherData(weather);
      } catch (error) {
        console.warn('Failed to update weather data:', error);
      }

      toast({
        title: "Calculation Complete",
        description: `Time needed: ${result.time_needed} minutes`,
      });
    } catch (error) {
      console.error('Temperature calculation failed:', error);
      toast({
        title: "Error",
        description: "Failed to calculate temperature",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleSetTemperature = async () => {
    if (!selectedEntity) return;

    try {
      await setClimateTemperature({
        entity_id: selectedEntity,
        temperature: targetTemp,
        hvac_mode: 'cool'
      });

      toast({
        title: "Success",
        description: `Thermostat set to ${targetTemp}°F`,
      });
    } catch (error) {
      console.error('Failed to set temperature:', error);
      toast({
        title: "Error",
        description: "Failed to set thermostat temperature",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'already_at_target':
        return 'text-green-500';
      case 'calculated':
        return 'text-blue-500';
      case 'cannot_calculate':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 60 && temp <= 68) return 'cold'; // Blue
    if (temp >= 68.1 && temp <= 77) return 'warning'; // Yellow
    if (temp >= 77.1 && temp <= 85) return 'destructive'; // Red
    return 'cold'; // Default
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'already_at_target':
        return <CheckCircle className="h-4 w-4" />;
      case 'calculated':
        return <Clock className="h-4 w-4" />;
      case 'cannot_calculate':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Temperature Calculation */}
      <Card>
        <CardHeader className="relative">
          <div>
            <CardTitle className="flex items-center gap-2 tracking-wide">
              <Thermometer className="h-5 w-5" />
              Smart Temperature Calculator
            </CardTitle>
            <CardDescription>
              Calculate optimal cooling time and send results to Home Assistant
            </CardDescription>
          </div>
          {/* Home Assistant Connection Status - Positioned at top right */}
          <div className="absolute top-4 right-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {connectionStatus?.connected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <Badge 
                      variant={connectionStatus?.connected ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {connectionStatus?.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{connectionStatus?.ha_url || "localhost:8123"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature Controls */}
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-32">
              {/* Current Temperature */}
              <div className="flex flex-col items-center space-y-4">
                <Label className="text-sm font-medium">Current Temperature</Label>
                <CircularMeter
                  value={currentTemp}
                  max={85}
                  min={60}
                  unit="°F"
                  label="Current"
                  color={getTemperatureColor(currentTemp)}
                  size="lg"
                  showControls={false}
                  isActive={true}
                  useCircularSlider={false}
                />
                <div className="flex flex-col items-center space-y-2">
                  <ElasticSlider
                    defaultValue={currentTemp}
                    startingValue={60}
                    maxValue={85}
                    isStepped={true}
                    stepSize={0.1}
                    leftIcon={<Minus className="h-4 w-4" />}
                    rightIcon={<Plus className="h-4 w-4" />}
                    onValueChange={(value) => setCurrentTemp(value)}
                    className="w-64"
                  />
                </div>
              </div>

              {/* Target Temperature */}
              <div className="flex flex-col items-center space-y-4">
                <Label className="text-sm font-medium">Target Temperature</Label>
                <CircularMeter
                  value={targetTemp}
                  max={85}
                  min={60}
                  unit="°F"
                  label="Target"
                  color={getTemperatureColor(targetTemp)}
                  size="lg"
                  showControls={false}
                  isActive={true}
                  useCircularSlider={false}
                />
                <div className="flex flex-col items-center space-y-2">
                  <ElasticSlider
                    defaultValue={targetTemp}
                    startingValue={60}
                    maxValue={85}
                    isStepped={true}
                    stepSize={0.1}
                    leftIcon={<Minus className="h-4 w-4" />}
                    rightIcon={<Plus className="h-4 w-4" />}
                    onValueChange={(value) => setTargetTemp(value)}
                    className="w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Other Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Williamsburg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival Time (HH:MM)</Label>
              <Input
                id="arrivalTime"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                placeholder="17:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squareFootage">Square Footage</Label>
              <Input
                id="squareFootage"
                type="number"
                value={squareFootage}
                onChange={(e) => setSquareFootage(Number(e.target.value))}
                placeholder="2200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numUnits">HVAC Units</Label>
              <Input
                id="numUnits"
                type="number"
                value={numUnits}
                onChange={(e) => setNumUnits(Number(e.target.value))}
                placeholder="1"
                min="1"
              />
            </div>
          </div>

          <Button 
            onClick={handleCalculate} 
            disabled={calculating}
            className="w-full"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Calculate & Send to HA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Calculation Results */}
      {calculationResult && (
        <Card>
          <CardHeader className="relative">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(calculationResult.status)}
                <span className="text-white">
                  Calculation Results
                </span>
              </CardTitle>
            </div>
            {/* Current Weather Indicator - Positioned at top right */}
            {weatherData && (
              <div className="absolute top-4 right-8">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Currently {weatherData.temperature}°F in {weatherData.city}
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-yellow-400">
                  {calculationResult.time_needed}
                </p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-yellow-400">
                  {calculationResult.current_temp}°F
                </p>
                <p className="text-sm text-muted-foreground">Current</p>
              </div>
              <div className="text-center py-8">
                <p className="text-2xl font-bold text-yellow-400">
                  {calculationResult.target_temp.toFixed(1)}°F
                </p>
                <p className="text-sm text-muted-foreground">Target</p>
              </div>
            </div>

            {calculationResult.time_needed > 0 && (
              <div className="mt-4">
                <Button 
                  onClick={handleSetTemperature}
                  className="w-full"
                  disabled={!selectedEntity}
                >
                  <Thermometer className="h-4 w-4 mr-2" />
                  Set Thermostat to {targetTemp}°F
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Climate Entities */}
      {climateEntities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Thermostats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {climateEntities.map((entity) => (
                <div 
                  key={entity.entity_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntity === entity.entity_id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedEntity(entity.entity_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {entity.attributes.friendly_name || entity.entity_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entity.attributes.current_temperature}°F → {entity.attributes.temperature}°F
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entity.attributes.hvac_mode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

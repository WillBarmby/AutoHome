import { useState } from "react";
import { DeviceCard } from "@/components/DeviceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Zap, 
  Thermometer,
  Lightbulb,
  Camera,
  Coffee
} from "lucide-react";
import { DeviceEntity } from "@/types";
import { mockDevices } from "@/services/mockData";
import { haAdapter } from "@/services/adapters";

const Devices = () => {
  const [devices, setDevices] = useState<DeviceEntity[]>(mockDevices);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const handleDeviceToggle = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      const newState = !device.state;
      await haAdapter.callService(
        device.type, 
        newState ? 'turn_on' : 'turn_off', 
        { entity_id: deviceId }
      );
      
      setDevices(prev => 
        prev.map(d => 
          d.id === deviceId 
            ? { ...d, state: newState }
            : d
        )
      );
    } catch (error) {
      console.error('Failed to toggle device:', error);
    }
  };

  const handleDeviceLevelChange = async (deviceId: string, level: number) => {
    try {
      await haAdapter.callService('light', 'turn_on', {
        entity_id: deviceId,
        brightness: level
      });
      
      setDevices(prev => 
        prev.map(d => 
          d.id === deviceId 
            ? { ...d, state: level, attributes: { ...d.attributes, brightness: level }}
            : d
        )
      );
    } catch (error) {
      console.error('Failed to change device level:', error);
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || device.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const deviceTypes = [...new Set(devices.map(d => d.type))];
  const activeDevices = devices.filter(d => d.state).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'light': return <Lightbulb className="h-4 w-4" />;
      case 'climate': return <Thermometer className="h-4 w-4" />;
      case 'camera': return <Camera className="h-4 w-4" />;
      case 'switch': return <Coffee className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Device Control</h1>
          <p className="text-sm text-muted-foreground">Manage all your smart home devices</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {activeDevices} of {devices.length} active
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            All
          </Button>
          {deviceTypes.map(type => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className="text-xs capitalize"
            >
              {getTypeIcon(type)}
              <span className="ml-1">{type}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deviceTypes.map(type => {
          const typeDevices = devices.filter(d => d.type === type);
          const activeTypeDevices = typeDevices.filter(d => d.state).length;
          return (
            <Card key={type} className="bg-gradient-card border-card-border">
              <CardContent className="p-4 text-center">
                {getTypeIcon(type)}
                <div className="text-lg font-bold mt-2">{activeTypeDevices}/{typeDevices.length}</div>
                <div className="text-xs text-muted-foreground capitalize">{type}s Active</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onToggle={handleDeviceToggle}
            onLevelChange={handleDeviceLevelChange}
          />
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No devices found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Devices;
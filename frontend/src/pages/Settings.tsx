import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Globe, 
  Shield,
  Database,
  Wifi,
  Save,
  Download,
  Upload
} from "lucide-react";

const Settings = () => {
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  
  const [settings, setSettings] = useState({
    // User Preferences
    username: "Admin",
    email: "admin@homeassistant.local",
    timezone: "America/New_York",
    language: "en",
    
    // Appearance
    theme: "dark",
    accentColor: "green",
    fontSize: 14,
    animations: true,
    
    // Notifications
    enableNotifications: true,
    emailAlerts: true,
    soundAlerts: false,
    quietHours: true,
    
    // AI Assistant
    aiVoiceEnabled: true,
    aiResponseSpeed: 50,
    aiConfidence: 75,
    aiLogging: true,
    
    // System
    autoUpdate: true,
    telemetry: false,
    backupEnabled: true,
    backupFrequency: "daily",
    
    // Security
    sessionTimeout: 60,
    twoFactorAuth: false,
    apiAccess: true,
    auditLogging: true
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    console.log('Saving settings...', settings);
    // Show toast notification here
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-home-settings.json';
    a.click();
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(imported);
        } catch (error) {
          console.error('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Animate elements on mount
  useEffect(() => {
    const elements = [
      headerRef.current,
      cardsRef.current
    ].filter(Boolean);

    gsap.fromTo(elements, 
      { 
        y: 30, 
        opacity: 0 
      },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.8, 
        stagger: 0.15,
        ease: 'power2.out'
      }
    );
  }, []);

  return (
    <div className="space-y-6 p-6 min-h-screen">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your AI Home Assistant</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/user-profile'}
          >
            <User className="h-4 w-4 mr-2" />
            Configure User Profile
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
          />
        </div>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Preferences */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={settings.username}
                onChange={(e) => updateSetting('username', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <Select value={settings.accentColor} onValueChange={(value) => updateSetting('accentColor', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Font Size: {settings.fontSize}px</Label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => updateSetting('fontSize', value)}
                max={20}
                min={12}
                step={1}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Enable Animations</Label>
              <Switch
                checked={settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Notifications</Label>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Email Alerts</Label>
              <Switch
                checked={settings.emailAlerts}
                onCheckedChange={(checked) => updateSetting('emailAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Sound Alerts</Label>
              <Switch
                checked={settings.soundAlerts}
                onCheckedChange={(checked) => updateSetting('soundAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Quiet Hours (10PM - 7AM)</Label>
              <Switch
                checked={settings.quietHours}
                onCheckedChange={(checked) => updateSetting('quietHours', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Voice Recognition</Label>
              <Switch
                checked={settings.aiVoiceEnabled}
                onCheckedChange={(checked) => updateSetting('aiVoiceEnabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Response Speed: {settings.aiResponseSpeed}%</Label>
              <Slider
                value={[settings.aiResponseSpeed]}
                onValueChange={([value]) => updateSetting('aiResponseSpeed', value)}
                max={100}
                min={10}
                step={10}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Confidence Threshold: {settings.aiConfidence}%</Label>
              <Slider
                value={[settings.aiConfidence]}
                onValueChange={([value]) => updateSetting('aiConfidence', value)}
                max={100}
                min={50}
                step={5}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Enable AI Logging</Label>
              <Switch
                checked={settings.aiLogging}
                onCheckedChange={(checked) => updateSetting('aiLogging', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto Update</Label>
              <Switch
                checked={settings.autoUpdate}
                onCheckedChange={(checked) => updateSetting('autoUpdate', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Send Telemetry</Label>
              <Switch
                checked={settings.telemetry}
                onCheckedChange={(checked) => updateSetting('telemetry', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Enable Backups</Label>
              <Switch
                checked={settings.backupEnabled}
                onCheckedChange={(checked) => updateSetting('backupEnabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Backup Frequency</Label>
              <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-gradient-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Timeout: {settings.sessionTimeout} minutes</Label>
              <Slider
                value={[settings.sessionTimeout]}
                onValueChange={([value]) => updateSetting('sessionTimeout', value)}
                max={240}
                min={15}
                step={15}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Two-Factor Authentication</Label>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>API Access</Label>
              <Switch
                checked={settings.apiAccess}
                onCheckedChange={(checked) => updateSetting('apiAccess', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Audit Logging</Label>
              <Switch
                checked={settings.auditLogging}
                onCheckedChange={(checked) => updateSetting('auditLogging', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
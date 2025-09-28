import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Settings,
  Activity,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Info
} from "lucide-react";
import { ChatMessage } from "@/types";
import { sendChatMessage } from "@/services/api";

const VoiceAssist = () => {
  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const voiceControlsRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const quickCommandsRef = useRef<HTMLDivElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(70);
  const [volume, setVolume] = useState(80);
  const [autoActivation, setAutoActivation] = useState(false);
  
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentTranscript(transcript);
        
        // If final result, process the command
        if (event.results[event.results.length - 1].isFinal) {
          processVoiceCommand(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setCurrentTranscript("");
      };
    }

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && voiceEnabled && !isMuted) {
      setIsListening(true);
      setCurrentTranscript("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceCommand = async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    
    try {
      const result = await sendChatMessage(transcript);
      setConversations(prev => [...prev, result.user, result.assistant]);

      if (!isMuted && synthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(result.response);
        utterance.volume = volume / 100;
        utterance.rate = 0.9;
        synthesisRef.current.speak(utterance);
      }
      
    } catch (error) {
      console.error('Failed to process voice command:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearConversations = () => {
    setConversations([]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthesisRef.current) {
      if (!isMuted) {
        synthesisRef.current.cancel();
      }
    }
  };

  const testVoice = () => {
    if (synthesisRef.current && !isMuted) {
      const utterance = new SpeechSynthesisUtterance("Voice assistant is working correctly. How can I help you today?");
      utterance.volume = volume / 100;
      utterance.rate = 0.9;
      synthesisRef.current.speak(utterance);
    }
  };

  // Animate elements on mount
  useEffect(() => {
    const elements = [
      headerRef.current,
      voiceControlsRef.current,
      conversationHistoryRef.current,
      settingsRef.current,
      quickCommandsRef.current
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
    <div className="space-y-6 p-10 min-h-screen bg-gradient-main bg-dot-grid relative">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Voice Assistant</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Control your home with voice commands</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={voiceEnabled ? "secondary" : "outline"} className="text-xs">
            {voiceEnabled ? "ENABLED" : "DISABLED"}
          </Badge>
          <Badge variant={isListening ? "default" : "outline"} className="text-xs">
            {isListening ? "LISTENING" : "IDLE"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Controls */}
        <div ref={voiceControlsRef} className="lg:col-span-1 space-y-6">
          {/* Main Controls */}
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 tracking-wide">
                <Mic className="h-5 w-5" />
                Voice Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Microphone Button */}
              <div className="flex justify-center">
                <Button
                  variant={isListening ? "destructive" : "default"}
                  size="lg"
                  className="h-20 w-20 rounded-full"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!voiceEnabled || isMuted}
                >
                  {isListening ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </Button>
              </div>

              {/* Current Transcript */}
              {currentTranscript && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Listening...</Label>
                  <p className="text-sm">{currentTranscript}</p>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 p-2">
                  <Activity className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Processing...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <div ref={settingsRef}>
            <Card className="bg-gradient-card border-card-border shadow-card h-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 tracking-wide">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Voice Assistant</Label>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto Activation</Label>
                <Switch
                  checked={autoActivation}
                  onCheckedChange={setAutoActivation}
                />
              </div>

              <div className="space-y-2">
                <Label>Sensitivity: {sensitivity}%</Label>
                <Slider
                  value={[sensitivity]}
                  onValueChange={([value]) => setSensitivity(value)}
                  max={100}
                  min={10}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Volume: {volume}%</Label>
                <Slider
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                  max={100}
                  min={0}
                  step={10}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className="flex-1"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 mr-2" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testVoice}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>
        </div>

        {/* Conversation History */}
        <div ref={conversationHistoryRef} className="lg:col-span-2">
          <Card className="bg-gradient-card border-card-border shadow-card h-[600px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 tracking-wide">
                <MessageSquare className="h-5 w-5" />
                Conversation History
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversations}
                disabled={conversations.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-4">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Click the microphone button to start talking to your AI assistant
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Commands */}
      <div ref={quickCommandsRef}>
        <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="tracking-wide">Voice Command Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "Turn on the living room lights",
              "Set temperature to 72 degrees",
              "What's the current energy usage?",
              "Turn off all lights",
              "Show me the security cameras",
              "Schedule the coffee maker for 7 AM"
            ].map((command, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-left justify-start h-auto p-3"
                onClick={() => processVoiceCommand(command)}
              >
                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{command}</span>
              </Button>
            ))}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceAssist;

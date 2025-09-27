import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, Square, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatIntent } from "@/types";
import { llmService } from "@/services/adapters";

interface ChatConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, intent: ChatIntent) => void;
  className?: string;
}

export function ChatConsole({ messages, onSendMessage, className }: ChatConsoleProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const intent = await llmService.parse(input.trim());
      onSendMessage(input.trim(), intent);
      setInput("");
    } catch (error) {
      console.error('Failed to parse message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      // Stop voice recognition
    } else {
      setIsListening(true);
      // Start voice recognition (would integrate with Web Speech API)
      // For now, just simulate
      setTimeout(() => {
        setIsListening(false);
        setInput("Turn on living room lights to 50%");
      }, 2000);
    }
  };

  const formatIntent = (intent: ChatIntent) => {
    return JSON.stringify(intent, null, 2);
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isProcessing) {
      scrollToBottom();
    }
  }, [isProcessing]);

  return (
    <Card className={cn("bg-gradient-card border-card-border shadow-card", className)}>
      <CardContent className="p-4">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="h-48 mb-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={cn(
                "flex items-start gap-3",
                message.type === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "flex items-center gap-2 max-w-[80%]",
                  message.type === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "p-2 rounded-full",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className={cn(
                    "space-y-2",
                    message.type === 'user' ? "text-right" : "text-left"
                  )}>
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {message.content}
                    </div>
                    
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to control your devices..."
              className="pr-12"
              disabled={isProcessing}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8",
                isListening && "bg-destructive text-destructive-foreground animate-pulse"
              )}
              onClick={toggleVoiceInput}
            >
              {isListening ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isListening && (
          <div className="mt-2 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
              Listening...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
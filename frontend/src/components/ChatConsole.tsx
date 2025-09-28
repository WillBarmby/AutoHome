import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, Square, User, Bot, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types";

interface ChatConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void | Promise<void>;
  onClearMessages?: () => void;
  className?: string;
}

export function ChatConsole({ messages, onSendMessage, onClearMessages, className }: ChatConsoleProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await onSendMessage(input.trim());
      setInput("");
    } catch (error) {
      console.error('Failed to send message:', error);
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
        setInput("What's the current temperature in the living room?");
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/90 to-primary/70 p-6 rounded-t-lg relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-4 after:bg-gradient-to-b after:from-transparent after:to-black/10 after:pointer-events-none">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
            whileHover={{ 
              rotate: [0, -5, 5, -5, 0],
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
          >
            <img 
              src="/imgs/helmrbot.png" 
              alt="helmr" 
              className="w-[150%] h-[150%] object-cover mt-3"
            />
          </motion.div>
          <div>
            <h3 className="text-white font-bold text-lg tracking-wide">hi, i'm helmr!</h3>
            <p className="text-green-100 text-sm">Here to guide your home</p>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="h-[600px] mb-4">
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
                <span className="text-sm">AI is thinking...</span>
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
              placeholder="Ask me anything about your smart home..."
              className="pr-12 h-10"
              disabled={isProcessing}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent hover:text-primary",
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
            className="h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
          
          {onClearMessages && (
            <Button 
              onClick={onClearMessages}
              disabled={messages.length === 0}
              variant="outline"
              title="Clear conversation"
              className="h-10 w-10 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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

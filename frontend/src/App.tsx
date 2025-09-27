import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Devices from "./pages/Devices";
import Guardrail from "./pages/Guardrail";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import KillSwitch from "./pages/KillSwitch";
import VoiceAssist from "./pages/VoiceAssist";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/guardrail" element={<Guardrail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/kill-switch" element={<KillSwitch />} />
            <Route path="/voice-assist" element={<VoiceAssist />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

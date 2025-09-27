import { 
  Home, 
  Cpu, 
  Shield, 
  Settings, 
  Power,
  Mic,
  User
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Devices", url: "/devices", icon: Cpu },
  { title: "Guardrail", url: "/guardrail", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "User Profile", url: "/user-profile", icon: User },
  { title: "Voice Assist", url: "/voice-assist", icon: Mic },
  { title: "Kill Switch", url: "/kill-switch", icon: Power },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  return (
    <Sidebar 
      className="bg-gradient-sidebar border-r border-sidebar-border"
      collapsible="icon"
    >
      <SidebarContent className="flex items-center justify-center h-full px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="relative flex flex-col items-center space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPath === item.url;
                
                return (
                  <SidebarMenuItem key={item.title} className="relative">
                    <SidebarMenuButton 
                      asChild 
                      className="p-0 h-14 w-14 mx-auto relative"
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        end
                        className={cn(
                          "flex items-center justify-center rounded-full transition-all duration-500 relative group overflow-hidden",
                          "border-2 backdrop-blur-sm",
                          // Default state
                          !isActive && [
                            "bg-gradient-to-br from-accent/40 to-accent/20 text-accent-foreground",
                            "border-accent/40 shadow-sm",
                            "hover:scale-110 hover:shadow-accent-glow hover:border-accent/60",
                            "hover:bg-gradient-to-br hover:from-accent/50 hover:to-accent/30"
                          ],
                          // Active state - no hover effects
                          isActive && [
                            "bg-gradient-to-br from-primary to-primary-glow text-white scale-110",
                            "border-primary ring-2 ring-primary/30",
                            "shadow-lg",
                            "after:absolute after:top-full after:left-1/2 after:transform after:-translate-x-1/2 after:w-8 after:h-2 after:bg-primary/30 after:blur-sm after:rounded-full"
                          ]
                        )}
                      >
                        {/* Background glow effect */}
                        <div className={cn(
                          "absolute inset-0 rounded-full transition-all duration-500",
                          isActive && "bg-gradient-to-br from-primary/20 to-primary-glow/20 animate-pulse"
                        )} />
                        
                        {/* Icon */}
                        <Icon className={cn(
                          "h-6 w-6 relative z-10 transition-all duration-300",
                          isActive ? "text-white drop-shadow-sm" : "text-accent-foreground group-hover:text-accent"
                        )} />
                        
                        {/* Ripple effect on hover - exclude active button */}
                        {!isActive && (
                          <div className="absolute inset-0 rounded-full bg-accent/20 scale-0 group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
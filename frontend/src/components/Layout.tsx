import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-main">
        <AppSidebar />
        
        <SidebarInset className="flex-1">
          <main className="flex-1 min-h-screen">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
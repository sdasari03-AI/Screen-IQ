import { AppSidebar } from "./app-sidebar";
import { AIAssistant } from "./ai-assistant";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <AIAssistant />
    </SidebarProvider>
  );
}

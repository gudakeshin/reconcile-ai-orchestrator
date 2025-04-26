
import React from 'react';
import { Sidebar } from './Sidebar';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BellIcon, UserCircle } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0 flex items-center px-4 md:px-6">
            <SidebarTrigger />
            
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <BellIcon className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon">
                <UserCircle className="h-5 w-5" />
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <div className="container py-6 md:py-8">{children}</div>
          </main>
          
          <footer className="py-2 px-4 md:px-6 border-t text-xs text-muted-foreground">
            <div className="container flex items-center justify-between">
              <p>© 2025 Reconcile AI Orchestrator</p>
              <p>Version 1.0.0</p>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

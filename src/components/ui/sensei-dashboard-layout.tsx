import React from "react";
import { Navigation } from "@/components/ui/navigation";
import { DashboardAccessGuard } from "@/components/ui/dashboard-access-guard";
import { SenseiSidebar } from "@/components/ui/sensei-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

interface SenseiDashboardLayoutProps {
  children: React.ReactNode;
  senseiName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onEditProfile: () => void;
}

export function SenseiDashboardLayout({ 
  children, 
  senseiName, 
  activeTab, 
  onTabChange, 
  onEditProfile 
}: SenseiDashboardLayoutProps) {
  return (
    <DashboardAccessGuard requiredRole="sensei">
      <SidebarProvider>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted w-full">
          {/* Global Header */}
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center">
                <SidebarTrigger className="mr-4" />
                <Navigation />
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={onEditProfile}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </header>

          <div className="flex min-h-[calc(100vh-4rem)] w-full">
            <SenseiSidebar 
              activeTab={activeTab} 
              onTabChange={onTabChange}
            />
            
            <main className="flex-1 p-6 overflow-auto">
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    Welcome back, {senseiName}!
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Manage your trips and profile from your dashboard
                  </p>
                </div>

                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </DashboardAccessGuard>
  );
}
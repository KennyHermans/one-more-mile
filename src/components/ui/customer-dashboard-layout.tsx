import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CustomerSidebar } from "@/components/ui/customer-sidebar";
import { Navigation } from "@/components/ui/navigation";
import { DashboardAccessGuard } from "@/components/ui/dashboard-access-guard";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface CustomerDashboardLayoutProps {
  children: ReactNode;
  customerName?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onEditProfile?: () => void;
  notificationCounts?: Record<string, number>;
}

export function CustomerDashboardLayout({ 
  children, 
  customerName, 
  activeTab, 
  onTabChange, 
  onEditProfile,
  notificationCounts 
}: CustomerDashboardLayoutProps) {
  return (
    <DashboardAccessGuard requiredRole="customer">
      <div className="min-h-screen bg-background w-full">
        <Navigation />
        
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <CustomerSidebar 
              activeTab={activeTab} 
              onTabChange={onTabChange} 
              notificationCounts={notificationCounts}
            />
            
            <main className="flex-1">
              <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center px-4">
                  <SidebarTrigger className="mr-4" />
                  <div className="flex-1">
                    <h1 className="text-lg font-semibold">
                      {customerName ? `Welcome back, ${customerName}` : "My Dashboard"}
                    </h1>
                  </div>
                  {onEditProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEditProfile}
                      className="ml-auto"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </header>
              
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </DashboardAccessGuard>
  );
}
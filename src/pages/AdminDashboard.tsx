import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { AdminDashboardOverview } from "@/components/ui/admin-dashboard-overview";
import { AdminAnalyticsDashboard } from "@/components/ui/admin-analytics-dashboard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  pendingApplications: number;
  totalSenseis: number;
  activeTrips: number;
  totalApplications: number;
  tripProposals: number;
  cancellations: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    pendingApplications: 0,
    totalSenseis: 0,
    activeTrips: 0,
    totalApplications: 0,
    tripProposals: 0,
    cancellations: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== 'kenny_hermans93@hotmail.com') {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        window.location.href = '/';
        return;
      }
      
      setUser(user);
      await fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate.",
        variant: "destructive",
      });
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch applications
      const { data: applications } = await supabase
        .from('applications')
        .select('*');

      // Fetch senseis
      const { data: senseis } = await supabase
        .from('sensei_profiles')
        .select('*');

      // Fetch trips
      const { data: trips } = await supabase
        .from('trips')
        .select('*');

      // Fetch trip cancellations
      const { data: cancellations } = await supabase
        .from('trip_cancellations')
        .select('*');

      const pendingApplications = applications?.filter(app => app.status === 'pending').length || 0;
      const activeTrips = trips?.filter(trip => trip.is_active).length || 0;
      const tripProposals = trips?.filter(trip => trip.created_by_sensei && trip.trip_status !== 'approved').length || 0;

      setStats({
        pendingApplications,
        totalSenseis: senseis?.length || 0,
        activeTrips,
        totalApplications: applications?.length || 0,
        tripProposals,
        cancellations: cancellations?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted w-full">
        {/* Global Header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center h-full px-4">
            <SidebarTrigger className="mr-4" />
            <Navigation />
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)] w-full">
          <AdminSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            pendingApplications={stats.pendingApplications}
          />
          
          <main className="flex-1 p-6 overflow-auto">
            {activeTab === "dashboard" && (
              <AdminDashboardOverview 
                stats={stats}
                onTabChange={setActiveTab}
              />
            )}
            
            {activeTab === "analytics" && (
              <AdminAnalyticsDashboard stats={stats} />
            )}
            
            {/* Placeholder for other tabs */}
            {activeTab === "applications" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Applications Management</h2>
                <p>Applications management content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "trips" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Trip Management</h2>
                <p>Trip management content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "sensei-assignment" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sensei Assignment</h2>
                <p>Sensei assignment content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "calendar" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Calendar</h2>
                <p>Calendar content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "proposals" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Trip Proposals</h2>
                <p>Trip proposals content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "announcements" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Announcements</h2>
                <p>Announcements content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "feedback" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Feedback</h2>
                <p>Feedback content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "cancellations" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Cancellations</h2>
                <p>Cancellations content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "senseis" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sensei Management</h2>
                <p>Sensei management content will be implemented here.</p>
              </div>
            )}
            
            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <p>Settings content will be implemented here.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
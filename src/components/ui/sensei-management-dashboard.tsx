import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { AdminSenseiOverview } from "./admin-sensei-overview";


import { AdminApplicationsView } from "./admin-applications-view";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { 
  Users, 
  UserCheck, 
  FileText, 
  TrendingUp, 
  MapPin, 
  Shield,
  Settings,
  BarChart3
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SenseiStats {
  totalSenseis: number;
  activeSenseis: number;
  pendingApplications: number;
  tripsRequiringBackup: number;
  averageRating: number;
}

export function SenseiManagementDashboard() {
  const [stats, setStats] = useState<SenseiStats>({
    totalSenseis: 0,
    activeSenseis: 0,
    pendingApplications: 0,
    tripsRequiringBackup: 0,
    averageRating: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real statistics from database
      const [senseiData, applicationData, tripData] = await Promise.all([
        supabase.from('sensei_profiles').select('id, is_active, rating'),
        supabase.from('applications').select('id, status'),
        supabase.from('trips').select('id, trip_status')
      ]);

      const totalSenseis = senseiData.data?.length || 0;
      const activeSenseis = senseiData.data?.filter(s => s.is_active).length || 0;
      const pendingApplications = applicationData.data?.filter(a => a.status === 'pending').length || 0;
      const tripsRequiringBackup = 0;
      const averageRating = senseiData.data?.length > 0 
        ? senseiData.data.reduce((acc, s) => acc + (s.rating || 0), 0) / senseiData.data.length 
        : 0;

      setStats({
        totalSenseis,
        activeSenseis,
        pendingApplications,
        tripsRequiringBackup,
        averageRating: Number(averageRating.toFixed(1))
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, description, variant = "default" }: {
    title: string;
    value: string | number;
    icon: any;
    description: string;
    variant?: "default" | "warning" | "success";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${
          variant === "warning" ? "text-yellow-500" :
          variant === "success" ? "text-green-500" : 
          "text-muted-foreground"
        }`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sensei Management</h1>
          <p className="text-muted-foreground">Comprehensive sensei administration and oversight</p>
        </div>
        <Button onClick={fetchStats} variant="outline">
          <BarChart3 className="mr-2 h-4 w-4" />
          Refresh Stats
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Senseis"
          value={stats.totalSenseis}
          icon={Users}
          description="All registered senseis"
        />
        <StatCard
          title="Active Senseis"
          value={stats.activeSenseis}
          icon={UserCheck}
          description="Currently active"
          variant="success"
        />
        <StatCard
          title="Pending Applications"
          value={stats.pendingApplications}
          icon={FileText}
          description="Awaiting review"
          variant={stats.pendingApplications > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Backup Needed"
          value={stats.tripsRequiringBackup}
          icon={Shield}
          description="Trips needing backup"
          variant={stats.tripsRequiringBackup > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Average Rating"
          value={stats.averageRating}
          icon={TrendingUp}
          description="Overall sensei rating"
          variant="success"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Applications
            {stats.pendingApplications > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.pendingApplications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active-senseis" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Senseis
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Trip Assignment
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Level Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <AdminSenseiOverview />
        </TabsContent>

        <TabsContent value="applications" className="space-y-6 mt-6">
          <AdminApplicationsView />
        </TabsContent>

        <TabsContent value="active-senseis" className="space-y-6 mt-6">
          <AdminSenseiOverview />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6 mt-6">
          <div className="text-center text-muted-foreground">
            Sensei assignment management has been simplified.
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6 mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sensei Management</CardTitle>
                <CardDescription>
                  Level management has been simplified. All senseis now have the same basic level.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
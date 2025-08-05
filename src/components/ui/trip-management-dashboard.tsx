import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { AdminTripManagementOverview } from "./admin-trip-management-overview";
import { TripProposalForm } from "./trip-proposal-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { 
  MapPin, 
  Calendar, 
  Users, 
  FileText, 
  UserCheck, 
  AlertTriangle,
  Plus,
  BarChart3
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TripStats {
  totalTrips: number;
  activeTrips: number;
  pendingProposals: number;
  completedTrips: number;
  cancellations: number;
}

export function TripManagementDashboard() {
  const [stats, setStats] = useState<TripStats>({
    totalTrips: 0,
    activeTrips: 0,
    pendingProposals: 0,
    completedTrips: 0,
    cancellations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchTripStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch trip statistics
      const { data: trips } = await supabase
        .from('trips')
        .select('is_active');

      const { data: applications } = await supabase
        .from('applications')
        .select('status');

      if (trips) {
        const totalTrips = trips.length;
        const activeTrips = trips.filter(t => t.is_active === true).length;
        const completedTrips = trips.filter(t => t.is_active === false).length;
        
        const pendingProposals = applications?.filter(p => p.status === 'pending').length || 0;
        const cancellations = 0; // Will be calculated differently

        setStats({
          totalTrips,
          activeTrips,
          pendingProposals,
          completedTrips,
          cancellations
        });
      }
    } catch (error) {
      console.error('Error fetching trip stats:', error);
      toast.error('Failed to load trip statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTripStats();
  }, []);

  const statCards = [
    {
      title: "Total Trips",
      value: stats.totalTrips,
      icon: MapPin,
      description: "All trips in system",
      color: "text-blue-600"
    },
    {
      title: "Active Trips",
      value: stats.activeTrips,
      icon: Calendar,
      description: "Currently active",
      color: "text-green-600"
    },
    {
      title: "Pending Proposals",
      value: stats.pendingProposals,
      icon: FileText,
      description: "Awaiting approval",
      color: "text-orange-600"
    },
    {
      title: "Completed",
      value: stats.completedTrips,
      icon: Users,
      description: "Successfully completed",
      color: "text-purple-600"
    },
    {
      title: "Cancellations",
      value: stats.cancellations,
      icon: AlertTriangle,
      description: "Cancelled trips",
      color: "text-red-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Trip Management</h2>
          <p className="text-muted-foreground">
            Comprehensive trip management and oversight
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Quick Actions
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Management Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="active-trips" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Active Trips
          </TabsTrigger>
          <TabsTrigger value="proposals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Proposals
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="creation" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create & Edit
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Management Overview</CardTitle>
              <CardDescription>
                Quick overview of all trip-related activities and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Recent Activity</h4>
                    <p className="text-sm text-muted-foreground">
                      Latest trip creations, updates, and status changes
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Upcoming Deadlines</h4>
                    <p className="text-sm text-muted-foreground">
                      Trips starting soon, payments due, applications closing
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active-trips" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Trips Management</CardTitle>
              <CardDescription>
                View and manage all currently active trips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Simple trip management interface - focus on core functionality
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Proposals Management</CardTitle>
              <CardDescription>
                Review and manage sensei-submitted trip proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TripProposalForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          <AdminTripManagementOverview />
        </TabsContent>

        <TabsContent value="creation" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Creation & Editing</CardTitle>
              <CardDescription>
                Create new trips and edit existing ones with full admin privileges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 border-2 border-dashed border-border rounded-lg text-center">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Create New Trip</h3>
                  <p className="text-muted-foreground mb-4">
                    Start creating a new adventure trip with full admin control
                  </p>
                  <Button onClick={() => window.open('/admin/trips', '_blank')}>
                    Open Trip Editor
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    For comprehensive trip creation and editing, use the dedicated trip editor.
                    This includes itinerary planning, sensei assignment, pricing, and all trip details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Issues & Cancellations</CardTitle>
              <CardDescription>
                Handle trip cancellations, replacements, and issue resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Cancelled Trips
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {stats.cancellations} trips have been cancelled and may need follow-up
                  </p>
                  <Button variant="outline" size="sm">
                    View Cancelled Trips
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Replacement Senseis</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage sensei replacements for trips with issues
                  </p>
                  <Button variant="outline" size="sm">
                    Manage Replacements
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
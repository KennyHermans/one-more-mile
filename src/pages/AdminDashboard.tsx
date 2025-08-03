import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/ui/navigation";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { AdminDashboardOverview } from "@/components/ui/admin-dashboard-overview";
import { AdminAnalyticsDashboard } from "@/components/ui/admin-analytics-dashboard";
import { AdvancedAnalyticsDashboard } from "@/components/ui/advanced-analytics-dashboard";
import { RealTimeAvailability } from "@/components/ui/real-time-availability";
import { SmartAlerts, NotificationCenter } from "@/components/ui/smart-alerts";
import { AdminLoadingStates } from "@/components/ui/admin-loading-states";
import { RealTimeAdminDashboard } from "@/components/ui/real-time-admin-dashboard";
import { AutomatedBackupAssignment } from "@/components/ui/automated-backup-assignment";
import { DatabaseOptimization } from "@/components/ui/database-optimization";
import { Phase1Summary } from "@/components/ui/phase1-summary";
import { AdminFilters } from "@/components/ui/admin-filters";
import { ActionButtons, BulkActions, ConfirmationDialog } from "@/components/ui/admin-actions";
import { BulkOperations } from "@/components/ui/bulk-operations";
import { GlobalSearch } from "@/components/ui/global-search";
import { CommunicationHub } from "@/components/ui/communication-hub";
import { AdvancedTripManagement } from "@/components/ui/advanced-trip-management";
import { TripCalendar } from "@/components/ui/trip-calendar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SenseiPermissionsDialog } from "@/components/ui/sensei-permissions-dialog";
import { AdminSenseiOverview } from "@/components/ui/admin-sensei-overview";
import { AdminTripManagementOverview } from "@/components/ui/admin-trip-management-overview";
import { SenseiAssignmentManagement } from "@/components/ui/sensei-assignment-management";
import { AdminBackupAlerts } from "@/components/ui/admin-backup-alerts";
import { AdminRoleManagement } from "@/components/ui/admin-role-management";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Check, 
  X,
  Plus,
  Edit2,
  Trash2,
  Star,
  MapPin,
  Calendar,
  Users,
  Settings,
  TrendingUp,
  UserCheck,
  Plane,
  Megaphone,
  AlertTriangle,
  Info,
  FileText,
  Mail,
  Search
} from "lucide-react";

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  location: string;
  expertise_areas: string[];
  languages: string[];
  status: string;
  created_at: string;
  bio: string;
  why_sensei: string;
  years_experience: number;
  portfolio_url?: string;
  reference_text?: string;
  availability: string;
  cv_file_url?: string;
}

interface PaymentSettings {
  id: string;
  setting_name: string;
  setting_value: any;
  description: string;
}

interface TripBooking {
  id: string;
  user_id: string;
  booking_status: string;
  payment_status: string;
  booking_date: string;
  total_amount: number;
  payment_deadline?: string;
  customer_profiles: {
    full_name: string;
    phone?: string;
  };
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  group_size: string;
  sensei_name: string;
  sensei_id: string | null;
  image_url: string;
  theme: string;
  rating: number;
  duration_days: number;
  difficulty_level: string;
  max_participants: number;
  current_participants: number;
  is_active: boolean;
  program: any[];
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  trip_status?: string;
  created_by_sensei?: boolean;
  created_by_user_id?: string;
  cancelled_by_sensei?: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  replacement_needed?: boolean;
}

interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  target_audience: 'all_senseis' | 'active_senseis' | 'specific_senseis';
  specific_sensei_ids?: string[];
  is_active: boolean;
  created_at: string;
}

interface TripCancellation {
  id: string;
  trip_id: string;
  cancelled_by_sensei_id: string;
  cancellation_reason: string;
  cancelled_at: string;
  replacement_sensei_id?: string;
  replacement_assigned_at?: string;
  admin_notified: boolean;
  created_at: string;
  updated_at: string;
  trips?: {
    title: string;
    destination: string;
    dates: string;
  } | null;
  sensei_profiles?: {
    name: string;
  } | null;
}

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  specialties: string[];
  experience: string;
  location: string;
  user_id: string;
  can_create_trips: boolean;
  trip_creation_requested: boolean;
  trip_creation_request_date: string | null;
  bio: string;
  rating: number;
  trips_led: number;
  is_active?: boolean;
}

interface DashboardStats {
  pendingApplications: number;
  totalSenseis: number;
  activeTrips: number;
  totalApplications: number;
  tripProposals: number;
  cancellations: number;
}

const AdminDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings[]>([]);
  const [tripBookings, setTripBookings] = useState<{[tripId: string]: TripBooking[]}>({});
  const [loadingBookings, setLoadingBookings] = useState<{[tripId: string]: boolean}>({});
  const [senseiFeedback, setSenseiFeedback] = useState<any[]>([]);
  const [tripCancellations, setTripCancellations] = useState<TripCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedTripForPermissions, setSelectedTripForPermissions] = useState<string>("");
  const [tripProposals, setTripProposals] = useState<Trip[]>([]);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState<TripCancellation | null>(null);
  const [suggestedSenseis, setSuggestedSenseis] = useState<SenseiProfile[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    target_audience: 'all_senseis' as 'all_senseis' | 'active_senseis' | 'specific_senseis',
    specific_sensei_ids: [] as string[]
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({ from: undefined, to: undefined });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {}
  });
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [savedFilters, setSavedFilters] = useState([
    {
      id: "1",
      name: "Pending Applications",
      query: "",
      filters: [{ key: 'status', label: 'Pending', value: 'pending', type: 'status' as const }],
      entityType: "applications"
    },
    {
      id: "2", 
      name: "Active Trips This Month",
      query: "",
      filters: [
        { key: 'status', label: 'Active', value: 'active', type: 'status' as const },
        { key: 'date', label: 'Last 30 days', value: '30d', type: 'date' as const }
      ],
      entityType: "trips"
    }
  ]);
  const { toast } = useToast();

  // Stats
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const approvedApplications = applications.filter(app => app.status === 'approved').length;
  const activeTrips = trips.filter(trip => trip.is_active).length;
  const totalSenseis = senseis.length;

  const stats: DashboardStats = {
    pendingApplications,
    totalSenseis,
    activeTrips,
    totalApplications: applications.length,
    tripProposals: tripProposals.length,
    cancellations: tripCancellations.length
  };

  // Filtered data with useMemo for performance
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = searchQuery === "" || 
        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      
      const matchesLocation = locationFilter === "all" || 
        app.location.toLowerCase().includes(locationFilter.toLowerCase());
      
      const matchesDate = !dateRange.from || 
        new Date(app.created_at) >= dateRange.from;
      
      return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });
  }, [applications, searchQuery, statusFilter, locationFilter, dateRange]);

  // Get unique locations for filter options
  const locationOptions = useMemo(() => {
    const locations = [...new Set(applications.map(app => app.location))];
    return [
      { value: "all", label: "All Locations" },
      ...locations.map(location => ({ 
        value: location, 
        label: location,
        count: applications.filter(app => app.location === location).length
      }))
    ];
  }, [applications]);

  // Status options with counts
  const statusOptions = useMemo(() => [
    { value: "all", label: "All Statuses", count: applications.length },
    { value: "pending", label: "Pending", count: applications.filter(app => app.status === 'pending').length },
    { value: "approved", label: "Approved", count: applications.filter(app => app.status === 'approved').length },
    { value: "rejected", label: "Rejected", count: applications.filter(app => app.status === 'rejected').length }
  ], [applications]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      
      setUser(user);
      await Promise.all([
        fetchApplications(), 
        fetchTrips(), 
        fetchSenseis(), 
        fetchPaymentSettings(), 
        fetchSenseiFeedback(), 
        fetchTripCancellations(), 
        fetchAdminAnnouncements()
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(trip => ({
        ...trip,
        program: typeof trip.program === 'string' 
          ? JSON.parse(trip.program) 
          : Array.isArray(trip.program) 
            ? trip.program 
            : []
      })) as Trip[];
      
      setTrips(transformedData);
      setTripProposals(transformedData.filter(trip => trip.created_by_sensei && trip.trip_status !== 'approved'));
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchSenseis = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSenseis(data || []);
    } catch (error) {
      console.error('Error fetching senseis:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .order('setting_name', { ascending: true });

      if (error) throw error;
      setPaymentSettings(data || []);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const fetchSenseiFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_feedback')
        .select(`
          *,
          trips (
            title,
            destination
          ),
          sensei_profiles (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSenseiFeedback(data || []);
    } catch (error) {
      console.error('Error fetching sensei feedback:', error);
    }
  };

  const fetchTripCancellations = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_cancellations')
        .select(`
          *,
          trips (
            title,
            destination,
            dates
          ),
          sensei_profiles!cancelled_by_sensei_id (
            name
          )
        `)
        .order('cancelled_at', { ascending: false });

      if (error) throw error;
      setTripCancellations((data as any) || []);
    } catch (error) {
      console.error('Error fetching trip cancellations:', error);
    }
  };

  const fetchAdminAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminAnnouncements((data || []) as AdminAnnouncement[]);
    } catch (error) {
      console.error('Error fetching admin announcements:', error);
    }
  };

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const approveApplication = async (application: Application) => {
    setProcessing(application.id);
    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from('sensei_profiles')
        .insert({
          user_id: application.user_id,
          name: application.full_name,
          specialty: application.expertise_areas[0] || 'General',
          bio: application.bio,
          experience: `${application.years_experience} years`,
          location: application.location,
          specialties: application.expertise_areas,
          is_active: true,
          rating: 0.0,
          trips_led: 0
        });

      if (insertError) throw insertError;

      toast({
        title: "Application Approved",
        description: `${application.full_name} has been approved as a Sensei!`,
      });

      await Promise.all([fetchApplications(), fetchSenseis()]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve application.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const rejectApplication = async (application: Application) => {
    setProcessing(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application Rejected",
        description: `${application.full_name}'s application has been rejected.`,
      });

      fetchApplications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleGlobalSearch = (query: string, searchFilters: any[], entityType: string) => {
    setGlobalSearchQuery(query);
    // Apply global search logic here
    console.log("Global search:", { query, searchFilters, entityType });
    
    // Switch to the appropriate tab based on entity type
    if (entityType !== 'all') {
      setActiveTab(entityType);
    }
  };

  const handleSaveFilter = (filter: any) => {
    const newFilter = {
      ...filter,
      id: Date.now().toString()
    };
    setSavedFilters(prev => [...prev, newFilter]);
    toast({
      title: "Filter saved",
      description: `"${filter.name}" has been saved for future use.`
    });
  };

  const createAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      toast({
        title: "Error",
        description: "Title and content are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_announcements')
        .insert({
          title: announcementForm.title,
          content: announcementForm.content,
          priority: announcementForm.priority,
          target_audience: announcementForm.target_audience,
          specific_sensei_ids: announcementForm.target_audience === 'specific_senseis' 
            ? announcementForm.specific_sensei_ids 
            : null,
          is_active: true,
          created_by_admin: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully!",
      });

      // Reset form and close dialog
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        target_audience: 'all_senseis',
        specific_sensei_ids: []
      });
      setCreateAnnouncementOpen(false);
      
      // Refresh announcements
      await fetchAdminAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive",
      });
    }
  };

  const entityTypes = [
    { value: 'applications', label: 'Applications', count: applications.length },
    { value: 'trips', label: 'Trips', count: trips.length },
    { value: 'senseis', label: 'Senseis', count: senseis.length },
    { value: 'bookings', label: 'Bookings', count: tripBookings ? Object.values(tripBookings).flat().length : 0 }
  ];

  // Transform data for bulk operations (these are not mock but mapped real data)
  const transformedApplications = applications.map(app => ({
    id: app.id,
    name: app.full_name,
    email: app.email,
    status: app.status
  }));

  const transformedTrips = trips.map(trip => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    status: trip.is_active ? 'active' : 'inactive'
  }));

  const transformedSenseis = senseis.map(sensei => ({
    id: sensei.id,
    name: sensei.name,
    location: sensei.location,
    status: sensei.is_active ? 'active' : 'inactive'
  }));

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
    <AdminAccessGuard>
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
              <NotificationCenter />
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)] w-full">
          <AdminSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            pendingApplications={stats.pendingApplications}
          />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              {/* Global Search */}
              <GlobalSearch
                onSearch={handleGlobalSearch}
                entityTypes={entityTypes}
                recentSearches={["pending applications", "active trips", "offline senseis"]}
                savedFilters={savedFilters}
                onSaveFilter={handleSaveFilter}
              />
              
              <SmartAlerts />
            </div>
            
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <RealTimeAdminDashboard 
                  onStatsUpdate={(newStats) => {
                    // Real-time stats are handled within the component
                  }}
                />
                
                {/* Database optimization utility */}
                <DatabaseOptimization />
                
                {/* Phase 1 completion summary */}
                <Phase1Summary />
              </div>
            )}
            
            {activeTab === "analytics" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AdvancedAnalyticsDashboard />
                </div>
                <div>
                  <RealTimeAvailability />
                </div>
              </div>
            )}
            
            {activeTab === "basic-analytics" && (
              <AdminAnalyticsDashboard stats={stats} />
            )}
            
            {activeTab === "applications" && (
              <div className="space-y-6">
                <AdminFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  locationFilter={locationFilter}
                  onLocationFilterChange={setLocationFilter}
                  isLoading={isRefreshing}
                  onRefresh={async () => {
                    setIsRefreshing(true);
                    await fetchApplications();
                    setIsRefreshing(false);
                  }}
                  totalCount={applications.length}
                  filteredCount={filteredApplications.length}
                  statusOptions={statusOptions}
                  locationOptions={locationOptions}
                />
                
                <BulkOperations
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  itemType="applications"
                  allItems={transformedApplications}
                />

                {selectedItems.length > 0 && (
                  <BulkActions
                    selectedItems={selectedItems}
                    onBulkAction={(action, items) => {
                      if (action === 'clear') {
                        setSelectedItems([]);
                      } else {
                        // Handle bulk actions
                        console.log(`Bulk action: ${action}`, items);
                      }
                    }}
                    availableActions={['approve', 'reject', 'archive']}
                  />
                )}

                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Sensei Applications</h2>
                  <Badge variant="outline" className="text-sm">
                    {pendingApplications} pending review
                  </Badge>
                </div>

                {filteredApplications.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== "all" || locationFilter !== "all"
                          ? "Try adjusting your filters to see more results."
                          : "No sensei applications have been submitted yet."}
                      </p>
                      {(searchQuery || statusFilter !== "all" || locationFilter !== "all") && (
                        <Button variant="outline" onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setLocationFilter("all");
                          setDateRange({ from: undefined, to: undefined });
                        }}>
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredApplications.slice(0, 10).map((application) => (
                      <Card key={application.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedItems.includes(application.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedItems(prev => [...prev, application.id]);
                                  } else {
                                    setSelectedItems(prev => prev.filter(id => id !== application.id));
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="text-lg font-semibold">{application.full_name}</h3>
                                    <p className="text-muted-foreground">{application.email}</p>
                                    <p className="text-muted-foreground">{application.location}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(application.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <ActionButtons
                                    item={application}
                                    type="application"
                                    onView={() => setSelectedApplication(application)}
                                    onApprove={() => approveApplication(application)}
                                    onReject={() => rejectApplication(application)}
                                    disabled={processing === application.id}
                                  />
                                </div>
                              
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">Expertise Areas</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {application.expertise_areas.slice(0, 3).map((area) => (
                                        <Badge key={area} variant="secondary" className="text-xs">
                                          {area}
                                        </Badge>
                                      ))}
                                      {application.expertise_areas.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{application.expertise_areas.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">Experience</h4>
                                    <p className="text-sm text-muted-foreground">{application.years_experience} years</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "trips" && (
              <div className="space-y-6">
                <BulkOperations
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  itemType="trips"
                  allItems={transformedTrips}
                />
                <AdvancedTripManagement />
              </div>
            )}
            
            {activeTab === "communication" && user && (
              <CommunicationHub userId={user.id} />
            )}
            
            {activeTab === "sensei-assignment" && (
              <SenseiAssignmentManagement />
            )}
            
            {activeTab === "calendar" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Calendar</h2>
                <div className="bg-card rounded-lg p-4">
                  <p className="text-muted-foreground">Calendar view will be implemented here.</p>
                </div>
              </div>
            )}
            
            {activeTab === "trip-permissions" && (
              <AdminTripManagementOverview />
            )}
            
            {activeTab === "proposals" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Trip Proposals</h2>
                  <Badge variant="outline" className="text-sm">
                    {tripProposals.length} pending proposals
                  </Badge>
                </div>

                {tripProposals.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">No trip proposals found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {tripProposals.map((trip) => (
                      <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{trip.title}</h3>
                              <p className="text-muted-foreground">{trip.destination}</p>
                              <p className="text-muted-foreground">{trip.dates}</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Proposed by: {trip.sensei_name}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button variant="destructive" size="sm">
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "announcements" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Admin Announcements</h2>
                  <Button onClick={() => setCreateAnnouncementOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Announcement
                  </Button>
                </div>

                <div className="grid gap-4">
                  {adminAnnouncements.map((announcement) => (
                    <Card key={announcement.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <p className="text-muted-foreground mt-2">{announcement.content}</p>
                            <div className="flex items-center gap-2 mt-4">
                              <Badge variant={announcement.priority === 'urgent' ? 'destructive' : 'secondary'}>
                                {announcement.priority}
                              </Badge>
                              <Badge variant="outline">{announcement.target_audience}</Badge>
                              <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                                {announcement.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === "feedback" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sensei Feedback</h2>
                
                <div className="grid gap-4">
                  {senseiFeedback.map((feedback) => (
                    <Card key={feedback.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="font-semibold">{feedback.rating}/5</span>
                            </div>
                            <p className="text-muted-foreground">{feedback.feedback_text}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Trip: {feedback.trips?.title} | Sensei: {feedback.sensei_profiles?.name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === "cancellations" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Trip Cancellations</h2>
                  <Badge variant="outline" className="text-sm">
                    {tripCancellations.length} cancellations
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {tripCancellations.map((cancellation) => (
                    <Card key={cancellation.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold">{cancellation.trips?.title}</h3>
                            <p className="text-muted-foreground">{cancellation.trips?.destination}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Cancelled by: {cancellation.sensei_profiles?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Reason: {cancellation.cancellation_reason}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Users className="w-4 h-4 mr-1" />
                              Find Replacement
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === "senseis" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Sensei Management</h2>
                <AdminSenseiOverview />
              </div>
            )}
            
            {activeTab === "alerts" && (
              <div className="space-y-6">
                <AdminBackupAlerts />
              </div>
            )}
            
            {activeTab === "automation" && (
              <div className="space-y-6">
                <AutomatedBackupAssignment />
              </div>
            )}
            
            {activeTab === "roles" && (
              <div className="space-y-6">
                <AdminRoleManagement />
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Trip Calendar</h2>
                <TripCalendar />
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Payment Settings</h2>
                
                <div className="grid gap-4">
                  {paymentSettings.map((setting) => (
                    <Card key={setting.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h3 className="font-semibold">{setting.setting_name}</h3>
                            <p className="text-muted-foreground">{setting.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm">
                              {JSON.stringify(setting.setting_value)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Create Announcement Dialog */}
        <Dialog open={createAnnouncementOpen} onOpenChange={setCreateAnnouncementOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Admin Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter announcement content"
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={announcementForm.priority}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as 'normal' | 'high' | 'urgent' }))}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <select
                  id="audience"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={announcementForm.target_audience}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, target_audience: e.target.value as 'all_senseis' | 'active_senseis' | 'specific_senseis' }))}
                >
                  <option value="all_senseis">All Senseis</option>
                  <option value="active_senseis">Active Senseis</option>
                  <option value="specific_senseis">Specific Senseis</option>
                </select>
              </div>
              
              {announcementForm.target_audience === 'specific_senseis' && (
                <div>
                  <Label>Select Senseis</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {senseis.map((sensei) => (
                      <div key={sensei.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={announcementForm.specific_sensei_ids.includes(sensei.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAnnouncementForm(prev => ({
                                ...prev,
                                specific_sensei_ids: [...prev.specific_sensei_ids, sensei.id]
                              }));
                            } else {
                              setAnnouncementForm(prev => ({
                                ...prev,
                                specific_sensei_ids: prev.specific_sensei_ids.filter(id => id !== sensei.id)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{sensei.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateAnnouncementOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAnnouncement}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Application Detail Dialog */}
        <Dialog open={selectedApplication !== null} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="font-medium">{selectedApplication.full_name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <p className="font-medium">{selectedApplication.location}</p>
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <p className="font-medium">{selectedApplication.years_experience} years</p>
                  </div>
                </div>
                
                <div>
                  <Label>Bio</Label>
                  <p className="mt-1 text-sm">{selectedApplication.bio}</p>
                </div>
                
                <div>
                  <Label>Why become a Sensei?</Label>
                  <p className="mt-1 text-sm">{selectedApplication.why_sensei}</p>
                </div>
                
                <div>
                  <Label>Expertise Areas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedApplication.expertise_areas.map((area) => (
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </SidebarProvider>
    </AdminAccessGuard>
  );
};

export default AdminDashboard;
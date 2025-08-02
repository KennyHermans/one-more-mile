import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SenseiPermissionsDialog } from "@/components/ui/sensei-permissions-dialog";
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
  Plane
} from "lucide-react";
import { AdminSenseiOverview } from "@/components/ui/admin-sensei-overview";
import { AdminTripManagementOverview } from "@/components/ui/admin-trip-management-overview";
import { BackupSenseiManagement } from "@/components/ui/backup-sensei-management";

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
  const { toast } = useToast();

  // Stats
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const approvedApplications = applications.filter(app => app.status === 'approved').length;
  const activeTrips = trips.filter(trip => trip.is_active).length;
  const totalSenseis = senseis.length;

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
      await Promise.all([fetchApplications(), fetchTrips(), fetchSenseis(), fetchPaymentSettings(), fetchSenseiFeedback(), fetchTripCancellations()]);
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

  const updatePaymentSetting = async (settingName: string, value: any) => {
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({ setting_value: value })
        .eq('setting_name', settingName);

      if (error) throw error;

      toast({
        title: "Setting Updated",
        description: "Payment setting has been updated successfully.",
      });

      fetchPaymentSettings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting.",
        variant: "destructive",
      });
    }
  };

  const fetchTripParticipants = async (tripId: string) => {
    if (loadingBookings[tripId] || tripBookings[tripId]) return;
    
    setLoadingBookings(prev => ({ ...prev, [tripId]: true }));
    
    try {
      // First get the bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('trip_id', tripId)
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Then get the customer profiles for those bookings
      if (bookings && bookings.length > 0) {
        const userIds = bookings.map(booking => booking.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('customer_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const enrichedBookings: TripBooking[] = bookings.map(booking => {
          const profile = profiles?.find(p => p.user_id === booking.user_id);
          return {
            ...booking,
            customer_profiles: {
              full_name: profile?.full_name || 'Unknown',
              phone: profile?.phone || undefined
            }
          };
        });

        setTripBookings(prev => ({ ...prev, [tripId]: enrichedBookings }));
      } else {
        setTripBookings(prev => ({ ...prev, [tripId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching trip participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants.",
        variant: "destructive",
      });
    } finally {
      setLoadingBookings(prev => ({ ...prev, [tripId]: false }));
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

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trip deleted successfully!",
      });

      fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete trip.",
        variant: "destructive",
      });
    }
  };

  const approveTripProposal = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ 
          trip_status: 'approved',
          is_active: true 
        })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Trip Approved",
        description: "The trip proposal has been approved and is now live!",
      });

      fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve trip proposal.",
        variant: "destructive",
      });
    }
  };

  const rejectTripProposal = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ trip_status: 'rejected' })
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Trip Rejected",
        description: "The trip proposal has been rejected.",
      });

      fetchTrips();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject trip proposal.",
        variant: "destructive",
      });
    }
  };

  const suggestReplacementSenseis = async (cancellation: TripCancellation) => {
    try {
      // Get all active Senseis excluding the cancelled one
      const { data: allSenseis, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true)
        .neq('id', cancellation.cancelled_by_sensei_id);

      if (error) throw error;

      // Simple scoring system based on experience, rating, and specialties
      const scoredSenseis = (allSenseis || []).map(sensei => {
        let score = 0;
        
        // Rating weight (0-5 stars)
        score += (sensei.rating || 0) * 20;
        
        // Experience weight (trips led)
        score += (sensei.trips_led || 0) * 2;
        
        // Location preference (if same location as original trip)
        if (sensei.location && cancellation.trips?.destination.includes(sensei.location)) {
          score += 10;
        }
        
        return { ...sensei, score };
      });

      // Sort by score descending and take top 5
      const sortedSenseis = scoredSenseis
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setSuggestedSenseis(sortedSenseis);
      setSelectedCancellation(cancellation);
      setReplacementDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch replacement suggestions.",
        variant: "destructive",
      });
    }
  };

  const assignReplacementSensei = async (senseiId: string) => {
    if (!selectedCancellation) return;

    try {
      // Update the cancellation record
      const { error: cancellationError } = await supabase
        .from('trip_cancellations')
        .update({
          replacement_sensei_id: senseiId,
          replacement_assigned_at: new Date().toISOString()
        })
        .eq('id', selectedCancellation.id);

      if (cancellationError) throw cancellationError;

      // Update the trip with new sensei
      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('name')
        .eq('id', senseiId)
        .single();

      const { error: tripError } = await supabase
        .from('trips')
        .update({
          sensei_id: senseiId,
          sensei_name: senseiData?.name || 'Unknown',
          cancelled_by_sensei: false,
          replacement_needed: false
        })
        .eq('id', selectedCancellation.trip_id);

      if (tripError) throw tripError;

      toast({
        title: "Replacement Assigned",
        description: "The new Sensei has been assigned to the trip successfully.",
      });

      setReplacementDialogOpen(false);
      setSelectedCancellation(null);
      setSuggestedSenseis([]);
      await Promise.all([fetchTripCancellations(), fetchTrips()]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign replacement Sensei.",
        variant: "destructive",
      });
    }
  };

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

  const updateSenseiPermission = async (senseiId: string, canCreateTrips: boolean) => {
    try {
      const { error } = await supabase
        .from('sensei_profiles')
        .update({ can_create_trips: canCreateTrips })
        .eq('id', senseiId);

      if (error) throw error;

      toast({
        title: "Permission Updated",
        description: `Sensei trip creation permission has been ${canCreateTrips ? 'granted' : 'revoked'}.`,
      });

      fetchSenseis();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update permission.",
        variant: "destructive",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your platform from one central location
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold">{pendingApplications}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Senseis</p>
                  <p className="text-2xl font-bold">{totalSenseis}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trips</p>
                  <p className="text-2xl font-bold">{activeTrips}</p>
                </div>
                <Plane className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold">{applications.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="applications">
              <span className="flex items-center gap-2">
                Applications {pendingApplications > 0 && <Badge className="ml-2">{pendingApplications}</Badge>}
              </span>
            </TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="senseis">Senseis</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sensei Applications</h2>
              <Badge variant="outline" className="text-sm">
                {pendingApplications} pending review
              </Badge>
            </div>

            {applications.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No applications found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {applications.slice(0, 10).map((application) => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{application.full_name}</h3>
                              <p className="text-gray-600">{application.email}</p>
                              <p className="text-gray-600">{application.location}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(application.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={`flex items-center gap-1 ${getStatusColor(application.status)}`}>
                                {getStatusIcon(application.status)}
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
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
                              <p className="text-sm text-gray-600">{application.years_experience} years</p>
                            </div>
                          </div>
                          
                          {application.status === 'pending' && (
                            <div className="flex gap-2 pt-4 border-t">
                              <Button
                                onClick={() => approveApplication(application)}
                                disabled={processing === application.id}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => rejectApplication(application)}
                                disabled={processing === application.id}
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trip Management Tab */}
          <TabsContent value="trip-management" className="space-y-6">
            <AdminTripManagementOverview />
          </TabsContent>

          {/* Backup Sensei Tab */}
          <TabsContent value="backup-sensei" className="space-y-6">
            <BackupSenseiManagement isAdmin={true} />
          </TabsContent>

          {/* Sensei Management Tab */}
          <TabsContent value="senseis" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sensei Management</h2>
              <Badge variant="outline" className="text-sm">
                {senseis.length} total senseis
              </Badge>
            </div>

            {senseis.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No senseis found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {senseis.map((sensei) => (
                  <Card key={sensei.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{sensei.name}</h3>
                              <p className="text-gray-600">{sensei.specialty}</p>
                              <p className="text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {sensei.location}
                              </p>
                              <p className="text-sm text-gray-500">{sensei.experience}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{sensei.rating}</span>
                              </div>
                              <Badge variant={sensei.can_create_trips ? "default" : "secondary"}>
                                {sensei.can_create_trips ? "Can Create Trips" : "No Trip Creation"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Trips Led</p>
                              <p className="text-sm">{sensei.trips_led}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Rating</p>
                              <p className="text-sm">{sensei.rating}/5.0</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Trip Creation Request</p>
                              <p className="text-sm">
                                {sensei.trip_creation_requested 
                                  ? `Requested ${sensei.trip_creation_request_date ? new Date(sensei.trip_creation_request_date).toLocaleDateString() : ''}`
                                  : 'No request'
                                }
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm text-gray-700 line-clamp-2">{sensei.bio}</p>
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            {sensei.can_create_trips ? (
                              <Button
                                variant="destructive"
                                onClick={() => updateSenseiPermission(sensei.id, false)}
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Revoke Trip Creation
                              </Button>
                            ) : (
                              <Button
                                onClick={() => updateSenseiPermission(sensei.id, true)}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Grant Trip Creation
                              </Button>
                            )}
                            {sensei.trip_creation_requested && !sensei.can_create_trips && (
                              <Badge variant="outline" className="text-xs px-2 py-1">
                                ⏳ Permission Requested
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => window.location.href = `/senseis/${sensei.id}`}
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => window.location.href = '/admin/trips'}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add New Trip
                </Button>
              </div>
            </div>

            {trips.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trips found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trips.slice(0, 8).map((trip) => (
                  <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{trip.title}</h3>
                              <p className="text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {trip.destination}
                              </p>
                              <p className="text-gray-600 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {trip.dates}
                              </p>
                              {trip.sensei_name && (
                                <p className="text-sm text-gray-500">
                                  Sensei: {trip.sensei_name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={trip.is_active ? "default" : "secondary"}>
                                {trip.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.location.href = `/admin/trips`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {trip.sensei_id && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTripForPermissions(trip.id);
                                      setPermissionsDialogOpen(true);
                                    }}
                                  >
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteTrip(trip.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                           <div className="grid md:grid-cols-3 gap-4 mb-4">
                             <div>
                               <p className="text-sm font-medium text-gray-600">Price</p>
                               <p className="text-sm">{trip.price}</p>
                             </div>
                             <div>
                               <p className="text-sm font-medium text-gray-600">Group Size</p>
                               <p className="text-sm">{trip.group_size}</p>
                             </div>
                             <div>
                               <p className="text-sm font-medium text-gray-600">Duration</p>
                               <p className="text-sm">{trip.duration_days} days</p>
                             </div>
                           </div>

                           {/* Participants Section */}
                           <div className="border-t pt-4">
                             <div className="flex items-center justify-between mb-3">
                               <h4 className="font-semibold flex items-center gap-2">
                                 <Users className="w-4 h-4" />
                                 Participants ({tripBookings[trip.id]?.length || 0})
                               </h4>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => fetchTripParticipants(trip.id)}
                                 disabled={loadingBookings[trip.id]}
                               >
                                 {loadingBookings[trip.id] ? 'Loading...' : 'Load Participants'}
                               </Button>
                             </div>
                             
                             {tripBookings[trip.id] && (
                               <div className="space-y-2 max-h-40 overflow-y-auto">
                                 {tripBookings[trip.id].length === 0 ? (
                                   <p className="text-sm text-gray-500 italic">No participants yet</p>
                                 ) : (
                                   tripBookings[trip.id].map((booking) => (
                                     <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                       <div>
                                         <span className="font-medium">{booking.customer_profiles.full_name}</span>
                                         {booking.customer_profiles.phone && (
                                           <span className="text-gray-500 ml-2">({booking.customer_profiles.phone})</span>
                                         )}
                                       </div>
                                       <div className="flex items-center gap-2">
                                         <Badge 
                                           variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}
                                           className="text-xs"
                                         >
                                           {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                                         </Badge>
                                         <span className="text-xs text-gray-500">
                                           ${booking.total_amount}
                                         </span>
                                         {booking.payment_deadline && booking.payment_status === 'pending' && (
                                           <span className="text-xs text-orange-600">
                                             Due: {new Date(booking.payment_deadline).toLocaleDateString()}
                                           </span>
                                         )}
                                       </div>
                                     </div>
                                   ))
                                 )}
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trip Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Proposals</h2>
              <Badge variant="outline" className="text-sm">
                {tripProposals.length} proposals to review
              </Badge>
            </div>

            {tripProposals.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trip proposals to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tripProposals.map((proposal) => (
                  <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{proposal.title}</h3>
                              <p className="text-gray-600 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {proposal.destination}
                              </p>
                              <p className="text-gray-600 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {proposal.dates}
                              </p>
                              <p className="text-sm text-gray-500">
                                Proposed by: {proposal.sensei_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  proposal.trip_status === 'pending_approval' ? 'secondary' :
                                  proposal.trip_status === 'draft' ? 'outline' : 'destructive'
                                }
                              >
                                {proposal.trip_status === 'pending_approval' ? 'Pending Review' : 
                                 proposal.trip_status === 'draft' ? 'Draft' : 'Rejected'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Price</p>
                              <p className="text-sm">{proposal.price}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Duration</p>
                              <p className="text-sm">{proposal.duration_days} days</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Max Participants</p>
                              <p className="text-sm">{proposal.max_participants}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Difficulty</p>
                              <p className="text-sm">{proposal.difficulty_level}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-sm text-gray-700 line-clamp-3">{proposal.description}</p>
                          </div>

                          {proposal.trip_status === 'pending_approval' && (
                            <div className="flex gap-2 pt-4 border-t">
                              <Button
                                onClick={() => approveTripProposal(proposal.id)}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve & Publish
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => rejectTripProposal(proposal.id)}
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => window.location.href = `/admin/trips`}
                                size="sm"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          )}

                          {proposal.trip_status === 'draft' && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-gray-500 italic">
                                This proposal is still in draft status. The Sensei hasn't submitted it for review yet.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trip Cancellations Tab */}
          <TabsContent value="cancellations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Cancellations</h2>
              <Badge variant="outline" className="text-sm">
                {tripCancellations.filter(c => !c.replacement_sensei_id).length} pending replacement
              </Badge>
            </div>

            {tripCancellations.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trip cancellations found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tripCancellations.map((cancellation) => (
                  <Card key={cancellation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{cancellation.trips?.title || 'Unknown Trip'}</h3>
                              <p className="text-gray-600">{cancellation.trips?.destination}</p>
                              <p className="text-gray-600">{cancellation.trips?.dates}</p>
                              <p className="text-sm text-gray-500">
                                Cancelled by: {cancellation.sensei_profiles?.name || 'Unknown Sensei'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Cancelled on: {new Date(cancellation.cancelled_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={cancellation.replacement_sensei_id ? 
                                'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {cancellation.replacement_sensei_id ? 'Replaced' : 'Needs Replacement'}
                              </Badge>
                              {!cancellation.replacement_sensei_id && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => suggestReplacementSenseis(cancellation)}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Find Replacement
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Cancellation Reason</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {cancellation.cancellation_reason}
                            </p>
                          </div>

                          {cancellation.replacement_assigned_at && (
                            <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                              ✓ Replacement assigned on {new Date(cancellation.replacement_assigned_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sensei Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sensei Feedback</h2>
              <p className="text-sm text-gray-600">Private feedback from customers about Senseis</p>
            </div>

            {senseiFeedback.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No feedback received yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {senseiFeedback.map((feedback) => (
                  <Card key={feedback.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{feedback.trips?.title}</h3>
                          <p className="text-gray-600">{feedback.trips?.destination}</p>
                          <p className="text-sm text-gray-500">Sensei: {feedback.sensei_profiles?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                          <Badge variant={feedback.rating >= 4 ? "default" : feedback.rating >= 3 ? "secondary" : "destructive"}>
                            {feedback.rating}/5
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-1">Private Feedback:</h4>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{feedback.feedback_text}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                          <span>Submitted: {new Date(feedback.created_at).toLocaleDateString()}</span>
                          {feedback.rating < 3 && (
                            <Badge variant="destructive" className="text-xs">⚠️ Low Rating - Review Required</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payment Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Payment Settings</h2>
              <p className="text-sm text-gray-600">Configure automated payment reminders and deadlines</p>
            </div>

            <div className="grid gap-6">
              {paymentSettings.map((setting) => (
                <Card key={setting.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{setting.description}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Label htmlFor={setting.setting_name} className="min-w-32">
                        Current Value:
                      </Label>
                      {setting.setting_name === 'reminder_intervals_days' ? (
                        <Input
                          id={setting.setting_name}
                          defaultValue={JSON.stringify(setting.setting_value)}
                          placeholder="[7, 3, 1]"
                          onBlur={(e) => {
                            try {
                              const value = JSON.parse(e.target.value);
                              updatePaymentSetting(setting.setting_name, value);
                            } catch (error) {
                              toast({
                                title: "Invalid Format",
                                description: "Please enter a valid JSON array like [7, 3, 1]",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          id={setting.setting_name}
                          type="number"
                          defaultValue={setting.setting_value}
                          onBlur={(e) => updatePaymentSetting(setting.setting_name, e.target.value)}
                          className="flex-1"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {setting.setting_name === 'payment_deadline_months' && 'Months before trip start when payment is due'}
                      {setting.setting_name === 'reminder_intervals_days' && 'Array of days before deadline to send reminders (e.g., [7, 3, 1])'}
                      {setting.setting_name === 'reminder_frequency_hours' && 'Minimum hours between reminder emails to same customer'}
                      {setting.setting_name === 'grace_period_hours' && 'Hours after deadline before automatically cancelling reservation'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test Payment Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => {
                    // Trigger the payment reminders function manually for testing
                    supabase.functions.invoke('payment-reminders')
                      .then(() => {
                        toast({
                          title: "Test Run Completed",
                          description: "Payment reminders function has been executed for testing.",
                        });
                      })
                      .catch((error) => {
                        toast({
                          title: "Error",
                          description: "Failed to run payment reminders test.",
                          variant: "destructive",
                        });
                      });
                  }}
                >
                  Run Payment Reminders Now
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Manually trigger the payment reminder system for testing purposes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensei Overview Tab */}
          <TabsContent value="sensei-overview" className="space-y-6">
            <AdminSenseiOverview />
          </TabsContent>
        </Tabs>

        {/* Application Details Modal */}
        {selectedApplication && (
          <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedApplication.full_name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Contact Information</h3>
                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                    <p><strong>Location:</strong> {selectedApplication.location}</p>
                    <p><strong>Experience:</strong> {selectedApplication.years_experience} years</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Expertise Areas</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.expertise_areas.map((area) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedApplication.languages.map((language) => (
                        <Badge key={language} variant="outline">{language}</Badge>
                      ))}
                    </div>
                  </div>

                  {selectedApplication.portfolio_url && (
                    <div>
                      <h3 className="font-semibold mb-2">Portfolio</h3>
                      <a 
                        href={selectedApplication.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedApplication.portfolio_url}
                      </a>
                    </div>
                  )}

                  {selectedApplication.cv_file_url && (
                    <div>
                      <h3 className="font-semibold mb-2">CV/Resume</h3>
                      <a 
                        href={selectedApplication.cv_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download CV</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Professional Bio</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.bio}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Why Sensei?</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.why_sensei}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Availability</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedApplication.availability}
                    </p>
                  </div>

                  {selectedApplication.reference_text && (
                    <div>
                      <h3 className="font-semibold mb-2">References</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {selectedApplication.reference_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedApplication.status === 'pending' && (
                <div className="mt-6 pt-6 border-t flex gap-4">
                  <Button
                    onClick={() => {
                      approveApplication(selectedApplication);
                      setSelectedApplication(null);
                    }}
                    disabled={processing === selectedApplication.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve Application
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      rejectApplication(selectedApplication);
                      setSelectedApplication(null);
                    }}
                    disabled={processing === selectedApplication.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject Application
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Sensei Permissions Dialog */}
        <SenseiPermissionsDialog
          isOpen={permissionsDialogOpen}
          onClose={() => setPermissionsDialogOpen(false)}
          tripId={selectedTripForPermissions}
          onSave={() => {
            setPermissionsDialogOpen(false);
            // Optionally refresh data
          }}
        />

        {/* Replacement Sensei Dialog */}
        <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Find Replacement Sensei</DialogTitle>
            </DialogHeader>
            
            {selectedCancellation && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Trip Details</h3>
                  <p><strong>Trip:</strong> {selectedCancellation.trips?.title}</p>
                  <p><strong>Destination:</strong> {selectedCancellation.trips?.destination}</p>
                  <p><strong>Dates:</strong> {selectedCancellation.trips?.dates}</p>
                  <p><strong>Cancelled by:</strong> {selectedCancellation.sensei_profiles?.name}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Suggested Replacement Senseis</h3>
                  <div className="grid gap-4">
                    {suggestedSenseis.map((sensei) => (
                      <Card key={sensei.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold">{sensei.name}</h4>
                              <p className="text-sm text-gray-600">{sensei.location}</p>
                              <p className="text-sm text-gray-600">{sensei.experience}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span className="text-sm ml-1">{sensei.rating?.toFixed(1) || '0.0'}</span>
                                </div>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">{sensei.trips_led || 0} trips led</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-blue-600">Score: {Math.round((sensei as any).score)}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {sensei.specialties.slice(0, 3).map((specialty) => (
                                  <Badge key={specialty} variant="secondary" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button 
                              onClick={() => assignReplacementSensei(sensei.id)}
                              className="ml-4"
                            >
                              Assign
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
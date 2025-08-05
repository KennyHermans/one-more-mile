import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { DashboardAccessGuard } from "@/components/ui/dashboard-access-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TripMessagingEnhanced } from "@/components/ui/trip-messaging-enhanced";
import { Trip, TripFormData, ProgramDay } from '@/types/trip';
import { SenseiProfile as ImportedSenseiProfile } from '@/types/sensei';
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TripProposalForm } from "@/components/ui/trip-proposal-form";
import { SenseiAvailabilitySettings } from "@/components/ui/sensei-availability-settings";
import { SenseiCertificatesManagement } from "@/components/ui/sensei-certificates-management";
import { SenseiDashboardLayout } from "@/components/ui/sensei-dashboard-layout";

import { SenseiOverviewDashboard } from "@/components/ui/sensei-overview-dashboard";
import { SenseiTripsManagement } from "@/components/ui/sensei-trips-management";

import { useTripPermissions } from "@/hooks/use-trip-permissions";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { 
  DashboardHeaderSkeleton, 
  StatsGridSkeleton, 
  DataTableSkeleton,
  FormSkeleton 
} from "@/components/ui/enhanced-ui-skeletons";
import { 
  EnhancedTripCardSkeleton 
} from "@/components/ui/enhanced-trip-skeletons";
import { 
  PageLoadingState, 
  LoadingSpinner 
} from "@/components/ui/enhanced-loading-states";
import { 
  Calendar as CalendarIcon,
  MapPin,
  Users,
  TrendingUp,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  Clock,
  XCircle,
  Eye,
  Download,
  Megaphone,
  UserPlus,
  Target
} from "lucide-react";

interface LocalSenseiProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  specialty: string;
  location: string;
  specialties: string[];
  experience: string;
  image_url?: string;
  rating: number;
  trips_led: number;
  can_create_trips: boolean;
  sensei_level?: 'apprentice' | 'journey_guide' | 'master_sensei';
}

interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  due_date?: string;
  trip_id?: string;
}

interface TripParticipant {
  id: string;
  user_id: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  customer_profiles: {
    full_name: string;
    phone?: string;
  };
}

interface Application {
  id: string;
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  trip_id?: string;
  created_at: string;
  is_active: boolean;
  trips?: {
    title: string;
    destination: string;
  };
}

interface TripPermissions {
  title: boolean;
  description: boolean;
  destination: boolean;
  theme: boolean;
  dates: boolean;
  price: boolean;
  group_size: boolean;
  included_amenities: boolean;
  excluded_items: boolean;
  requirements: boolean;
  program: boolean;
}

// Helper function to ensure program is always an array
const ensureProgramIsArray = (program: any): ProgramDay[] => {
  if (Array.isArray(program)) {
    return program.map(day => ({
      ...day,
      activities: ensureActivitiesIsArray(day.activities)
    }));
  }
  if (typeof program === 'string') {
    try {
      const parsed = JSON.parse(program);
      if (Array.isArray(parsed)) {
        return parsed.map(day => ({
          ...day,
          activities: ensureActivitiesIsArray(day.activities)
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
  if (program && typeof program === 'object') {
    return [{
      ...program,
      activities: ensureActivitiesIsArray(program.activities)
    }];
  }
  return [];
};

// Helper function to ensure activities is always an array
const ensureActivitiesIsArray = (activities: any): string[] => {
  if (Array.isArray(activities)) return activities;
  if (typeof activities === 'string') {
    return activities.split('\n').filter(activity => activity.trim() !== '');
  }
  return [];
};

const SenseiDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [senseiProfile, setSenseiProfile] = useState<LocalSenseiProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripParticipants, setTripParticipants] = useState<{[tripId: string]: TripParticipant[]}>({});
  const [loadingParticipants, setLoadingParticipants] = useState<{[tripId: string]: boolean}>({});
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [cancelTripOpen, setCancelTripOpen] = useState(false);
  const [selectedTripForCancel, setSelectedTripForCancel] = useState<Trip | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [permissions, setPermissions] = useState<{ [key: string]: TripPermissions }>({});
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<any[]>([]);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    trip_id: ''
  });
  
  const { toast } = useToast();

  // Profile form data
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    bio: "",
    specialty: "",
    location: "",
    specialties: [] as string[],
    experience: "",
    image_url: "",
    phone: "",
    email: "",
    availability: "",
    notes: ""
  });

  // Trip editing form data
  const [tripFormData, setTripFormData] = useState({
    title: "",
    description: "",
    destination: "",
    theme: "",
    dates: "",
    price: "",
    max_participants: 1,
    included_amenities: [],
    excluded_items: [],
    requirements: [],
    program: []
  });

  // Stats calculations using real data
  const activeTrips = trips.filter(trip => trip.is_active && trip.trip_status === 'approved').length;
  const completedTrips = senseiProfile?.trips_led || 0;
  const upcomingTrips = trips.filter(trip => {
    try {
      const dateStr = trip.dates.split('-')[0].trim();
      const tripDate = new Date(dateStr);
      return tripDate > new Date() && trip.is_active && trip.trip_status === 'approved';
    } catch {
      return false;
    }
  }).length;
  const totalParticipants = trips.reduce((sum, trip) => sum + (trip.current_participants || 0), 0);

  useEffect(() => {
    checkAuth();
    
    const handleAvailabilityUpdate = () => {
      if (user) {
        fetchSenseiTrips(user.id);
      }
    };
    
    window.addEventListener('availabilityUpdated', handleAvailabilityUpdate);
    return () => window.removeEventListener('availabilityUpdated', handleAvailabilityUpdate);
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
        fetchSenseiProfile(user.id),
        fetchSenseiTrips(user.id),
        fetchTodos(user.id),
        fetchApplications(user.id),
        fetchTripPermissions(user.id),
        fetchAnnouncements(user.id),
        fetchAdminAnnouncements()
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate.",
        variant: "destructive",
      });
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  const fetchSenseiProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      setSenseiProfile(data);
      setProfileFormData({
        name: data.name || "",
        bio: data.bio || "",
        specialty: data.specialty || "",
        location: data.location || "",
        specialties: data.specialties || [],
        experience: data.experience || "",
        image_url: data.image_url || "",
        phone: "",
        email: user?.email || "",
        availability: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error fetching sensei profile:', error);
    }
  };

  const fetchSenseiTrips = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('sensei_profiles')
        .select('id, unavailable_months, is_offline')
        .eq('user_id', userId)
        .single();

      if (!profileData) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('sensei_id', profileData.id);

      if (error) throw error;
      
      const processedTrips = (data || []).map(trip => ({
        ...trip,
        program: ensureProgramIsArray(trip.program)
      }));
      
      setTrips(processedTrips);
    } catch (error) {
      console.error('Error fetching sensei trips:', error);
    }
  };

  const fetchTodos = async (userId: string) => {
    const storedTodos = localStorage.getItem(`todos_${userId}`);
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
  };

  const fetchApplications = async (userId: string) => {
    setLoadingApplications(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchTripPermissions = async (userId: string) => {
    try {
      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!senseiData) return;
      
      const { data: permissionsData } = await supabase
        .from('trip_permissions')
        .select('trip_id, permissions')
        .eq('sensei_id', senseiData.id);

      const permissionsMap: { [key: string]: TripPermissions } = {};
      permissionsData?.forEach(p => {
        permissionsMap[p.trip_id] = p.permissions as unknown as TripPermissions;
      });
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchAnnouncements = async (userId: string) => {
    try {
      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!senseiData) return;

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('sensei_id', senseiData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const announcementsWithTrips = await Promise.all(
        (data || []).map(async (announcement: any) => {
          if (announcement.trip_id) {
            const { data: tripData } = await supabase
              .from('trips')
              .select('title, destination')
              .eq('id', announcement.trip_id)
              .single();
            
            return {
              ...announcement,
              trips: tripData
            };
          }
          return announcement;
        })
      );
      
      setAnnouncements(announcementsWithTrips as Announcement[]);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchAdminAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching admin announcements:', error);
    }
  };

  const updateProfile = async () => {
    if (!user || !senseiProfile) return;

    try {
      const { error } = await supabase
        .from('sensei_profiles')
        .update({
          name: profileFormData.name,
          bio: profileFormData.bio,
          specialty: profileFormData.specialty,
          location: profileFormData.location,
          specialties: profileFormData.specialties,
          experience: profileFormData.experience,
          image_url: profileFormData.image_url
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSenseiProfile(prev => prev ? {
        ...prev,
        name: profileFormData.name,
        bio: profileFormData.bio,
        specialty: profileFormData.specialty,
        location: profileFormData.location,
        specialties: profileFormData.specialties,
        experience: profileFormData.experience,
        image_url: profileFormData.image_url
      } : null);

      setEditProfileOpen(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const updateTrip = async () => {
    if (!editingTrip || !user) return;

    try {
      const updatedTrip = {
        title: tripFormData.title,
        description: tripFormData.description,
        destination: tripFormData.destination,
        theme: tripFormData.theme,
        dates: tripFormData.dates,
        price: tripFormData.price
      };

      const { error } = await supabase
        .from('trips')
        .update(updatedTrip)
        .eq('id', editingTrip.id);

      if (error) throw error;

      setTrips(prev => prev.map(trip => 
        trip.id === editingTrip.id 
          ? { ...trip, ...updatedTrip }
          : trip
      ));

      setEditingTrip(null);
      toast({
        title: "Trip Updated",
        description: "Trip has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update trip.",
        variant: "destructive",
      });
    }
  };

  const addTodo = () => {
    if (!newTodo.trim() || !user) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      task: newTodo,
      completed: false
    };

    const updatedTodos = [...todos, todo];
    setTodos(updatedTodos);
    localStorage.setItem(`todos_${user.id}`, JSON.stringify(updatedTodos));
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    if (!user) return;

    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    localStorage.setItem(`todos_${user.id}`, JSON.stringify(updatedTodos));
  };

  const removeTodo = (id: string) => {
    if (!user) return;

    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    localStorage.setItem(`todos_${user.id}`, JSON.stringify(updatedTodos));
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setTripFormData({
      title: trip.title || "",
      description: trip.description || "",
      destination: trip.destination || "",
      theme: trip.theme || "",
      dates: trip.dates || "",
      price: trip.price || "",
      max_participants: trip.max_participants || 1,
      included_amenities: Array.isArray(trip.included_amenities) ? trip.included_amenities : [],
      excluded_items: Array.isArray(trip.excluded_items) ? trip.excluded_items : [],
      requirements: Array.isArray(trip.requirements) ? trip.requirements : [],
      program: ensureProgramIsArray(trip.program)
    });
  };

  const handleCreateTrip = () => {
    window.open('/trip-editor', '_blank');
  };

  const handleCancelTrip = async () => {
    if (!selectedTripForCancel || !cancellationReason.trim()) return;

    try {
      const { error } = await supabase.functions.invoke('cancel-trip', {
        body: {
          tripId: selectedTripForCancel.id,
          reason: cancellationReason,
          senseiId: senseiProfile?.id
        }
      });

      if (error) throw error;

      await fetchSenseiTrips(user.id);
      setCancelTripOpen(false);
      setSelectedTripForCancel(null);
      setCancellationReason("");
      
      toast({
        title: "Trip Cancelled",
        description: "Trip has been cancelled and participants have been notified.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel trip.",
        variant: "destructive",
      });
    }
  };

  const createAnnouncement = async () => {
    if (!user || !senseiProfile || !announcementForm.title.trim() || !announcementForm.content.trim()) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: announcementForm.title,
          content: announcementForm.content,
          priority: announcementForm.priority,
          trip_id: announcementForm.trip_id || null,
          sensei_id: senseiProfile.id,
          is_active: true
        });

      if (error) throw error;

      await fetchAnnouncements(user.id);
      setCreateAnnouncementOpen(false);
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        trip_id: ''
      });
      
      toast({
        title: "Announcement Created",
        description: "Your announcement has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoadingState title="Loading your sensei dashboard..." />;
  }

  return (
    <DashboardAccessGuard requiredRole="sensei">
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <SenseiDashboardLayout
          senseiName={senseiProfile?.name || "Sensei"}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEditProfile={() => setEditProfileOpen(true)}
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Dashboard Overview</h1>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeTrips}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{completedTrips}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Trips</CardTitle>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{upcomingTrips}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalParticipants}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Welcome back, {senseiProfile?.name || "Sensei"}! Here's what's happening with your trips.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "trips" && (
            <SenseiTripsManagement
              trips={trips}
              canCreateTrips={senseiProfile?.can_create_trips || false}
              canEditTrips={true}
              onCreateTrip={handleCreateTrip}
              onEditTrip={handleEditTrip}
              onViewTrip={() => {}}
              onCancelTrip={(trip) => {
                setSelectedTripForCancel(trip);
                setCancelTripOpen(true);
              }}
            />
          )}

          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Trip Messages</h1>
              </div>
              {trips.length > 0 && (
                <TripMessagingEnhanced 
                  tripId={trips[0].id}
                  tripTitle={trips[0].title}
                  userType="sensei"
                />
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Applications</h1>
              </div>
              <Card>
                <CardContent className="pt-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Trip Creation Requests</h3>
                  <p className="text-muted-foreground">
                    Trip creation request functionality has been removed. Contact your administrator for trip creation access.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "availability" && (
            <SenseiAvailabilitySettings />
          )}

          {activeTab === "backup" && (
            <div className="space-y-6 text-center">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Backup Sensei Program</h3>
                  <p className="text-muted-foreground">
                    The backup sensei program has been discontinued. Thank you for your interest in supporting fellow travelers.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "certificates" && (
            <SenseiCertificatesManagement senseiId={senseiProfile?.id || ""} />
          )}

          {activeTab === "gamification" && (
            <SenseiGamificationDashboard senseiId={senseiProfile?.id || ""} />
          )}
        </SenseiDashboardLayout>

        {/* Profile Edit Dialog */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileFormData.name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileFormData.bio}
                  onChange={(e) => setProfileFormData({ ...profileFormData, bio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={profileFormData.specialty}
                  onChange={(e) => setProfileFormData({ ...profileFormData, specialty: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profileFormData.location}
                  onChange={(e) => setProfileFormData({ ...profileFormData, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  value={profileFormData.experience}
                  onChange={(e) => setProfileFormData({ ...profileFormData, experience: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={updateProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trip Edit Dialog */}
        <Dialog open={!!editingTrip} onOpenChange={() => setEditingTrip(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Trip</DialogTitle>
            </DialogHeader>
            {editingTrip && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trip-title">Title</Label>
                  <Input
                    id="trip-title"
                    value={tripFormData.title}
                    onChange={(e) => setTripFormData({ ...tripFormData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="trip-description">Description</Label>
                  <Textarea
                    id="trip-description"
                    value={tripFormData.description}
                    onChange={(e) => setTripFormData({ ...tripFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="trip-destination">Destination</Label>
                  <Input
                    id="trip-destination"
                    value={tripFormData.destination}
                    onChange={(e) => setTripFormData({ ...tripFormData, destination: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="trip-price">Price</Label>
                  <Input
                    id="trip-price"
                    value={tripFormData.price}
                    onChange={(e) => setTripFormData({ ...tripFormData, price: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingTrip(null)}>
                    Cancel
                  </Button>
                  <Button onClick={updateTrip}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Trip Dialog */}
        <Dialog open={cancelTripOpen} onOpenChange={setCancelTripOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Are you sure you want to cancel this trip? This action cannot be undone.</p>
              <div>
                <Label htmlFor="cancellation-reason">Reason for cancellation</Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Please provide a reason for cancelling this trip..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCancelTripOpen(false)}>
                  Keep Trip
                </Button>
                <Button variant="destructive" onClick={handleCancelTrip}>
                  Cancel Trip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Announcement Dialog */}
        <Dialog open={createAnnouncementOpen} onOpenChange={setCreateAnnouncementOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="announcement-content">Content</Label>
                <Textarea
                  id="announcement-content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateAnnouncementOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAnnouncement}>
                  Create Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardAccessGuard>
  );
};

export default SenseiDashboard;
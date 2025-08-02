import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TripMessagingEnhanced } from "@/components/ui/trip-messaging-enhanced";
import { Label } from "@/components/ui/label";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TripProposalForm } from "@/components/ui/trip-proposal-form";
import { SenseiAvailabilitySettings } from "@/components/ui/sensei-availability-settings";
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
  MessageCircle
} from "lucide-react";

const localizer = momentLocalizer(moment);

interface Trip {
  id: string;
  title: string;
  destination: string;
  dates: string;
  max_participants: number;
  current_participants: number;
  is_active: boolean;
  sensei_id: string;
  trip_status?: string;
  created_by_sensei?: boolean;
  created_by_user_id?: string;
  duration_days?: number;
  cancelled_by_sensei?: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  replacement_needed?: boolean;
}

interface SenseiProfile {
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
  trip_creation_requested: boolean;
  trip_creation_request_date: string | null;
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
}

const SenseiDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [senseiProfile, setSenseiProfile] = useState<SenseiProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripParticipants, setTripParticipants] = useState<{[tripId: string]: TripParticipant[]}>({});
  const [loadingParticipants, setLoadingParticipants] = useState<{[tripId: string]: boolean}>({});
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [cancelTripOpen, setCancelTripOpen] = useState(false);
  const [selectedTripForCancel, setSelectedTripForCancel] = useState<Trip | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
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
    // Admin-only fields
    phone: "",
    email: "",
    availability: "",
    notes: ""
  });

  // Stats calculations
  const activeTrips = trips.filter(trip => trip.is_active).length;
  const completedTrips = senseiProfile?.trips_led || 0;
  const upcomingTrips = trips.filter(trip => {
    const tripDate = new Date(trip.dates.split(' - ')[0]);
    return tripDate > new Date() && trip.is_active;
  }).length;
  const totalParticipants = trips.reduce((sum, trip) => sum + trip.current_participants, 0);

  useEffect(() => {
    checkAuth();
    
    // Listen for availability updates to refresh calendar
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
        fetchTodos(user.id)
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
      // First get the sensei profile to get the sensei ID and availability data
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
      
      setTrips(data || []);
      
      // Convert trips to calendar events
      const tripEvents: CalendarEvent[] = (data || []).map(trip => {
        const dates = trip.dates.split(' - ');
        const startDate = new Date(dates[0]);
        const endDate = dates[1] ? new Date(dates[1]) : startDate;
        
        return {
          id: `trip-${trip.id}`,
          title: `🧳 ${trip.title}`,
          start: startDate,
          end: endDate,
          resource: { 
            ...trip, 
            type: 'trip',
            color: '#10b981' // Green for trips
          }
        };
      });

      // Create availability events for unavailable months
      const availabilityEvents: CalendarEvent[] = [];
      const currentYear = new Date().getFullYear();
      
      if (profileData.unavailable_months && profileData.unavailable_months.length > 0) {
        profileData.unavailable_months.forEach(monthName => {
          const monthIndex = moment().month(monthName).month();
          const startDate = new Date(currentYear, monthIndex, 1);
          const endDate = new Date(currentYear, monthIndex + 1, 0);
          
          availabilityEvents.push({
            id: `unavailable-${monthName}-${currentYear}`,
            title: `🚫 Unavailable - ${monthName}`,
            start: startDate,
            end: endDate,
            resource: { 
              type: 'unavailable',
              month: monthName,
              color: '#ef4444' // Red for unavailable
            }
          });
        });
      }

      // Add offline status as full year unavailability if applicable
      if (profileData.is_offline) {
        availabilityEvents.push({
          id: `offline-${currentYear}`,
          title: '💤 Profile Offline',
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31),
          resource: { 
            type: 'offline',
            color: '#6b7280' // Gray for offline
          }
        });
      }
      
      // Combine all events
      setCalendarEvents([...tripEvents, ...availabilityEvents]);
    } catch (error) {
      console.error('Error fetching sensei trips:', error);
    }
  };

  const fetchTodos = async (userId: string) => {
    // For now, we'll use local storage for todos
    // In a real app, you'd want to store these in the database
    const storedTodos = localStorage.getItem(`todos_${userId}`);
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
  };

  const saveTodos = (newTodos: TodoItem[]) => {
    if (user) {
      localStorage.setItem(`todos_${user.id}`, JSON.stringify(newTodos));
      setTodos(newTodos);
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    
    const todo: TodoItem = {
      id: Date.now().toString(),
      task: newTodo,
      completed: false,
      due_date: undefined,
      trip_id: undefined
    };
    
    const updatedTodos = [...todos, todo];
    saveTodos(updatedTodos);
    setNewTodo("");
  };

  const toggleTodo = (todoId: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos(updatedTodos);
  };

  const deleteTodo = (todoId: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    saveTodos(updatedTodos);
  };

  const fetchPaidParticipants = async (tripId: string) => {
    if (loadingParticipants[tripId] || tripParticipants[tripId]) return;
    
    setLoadingParticipants(prev => ({ ...prev, [tripId]: true }));
    
    try {
      // Get only PAID bookings for this trip
      const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('trip_id', tripId)
        .eq('payment_status', 'paid') // Only paid participants
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get customer profiles for the paid bookings
      if (bookings && bookings.length > 0) {
        const userIds = bookings.map(booking => booking.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('customer_profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const enrichedBookings: TripParticipant[] = bookings.map(booking => {
          const profile = profiles?.find(p => p.user_id === booking.user_id);
          return {
            id: booking.id,
            user_id: booking.user_id,
            booking_status: booking.booking_status,
            payment_status: booking.payment_status,
            total_amount: booking.total_amount,
            customer_profiles: {
              full_name: profile?.full_name || 'Unknown',
              phone: profile?.phone || undefined
            }
          };
        });

        setTripParticipants(prev => ({ ...prev, [tripId]: enrichedBookings }));
      } else {
        setTripParticipants(prev => ({ ...prev, [tripId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching paid participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants.",
        variant: "destructive",
      });
    } finally {
      setLoadingParticipants(prev => ({ ...prev, [tripId]: false }));
    }
  };

  const handleProfileUpdate = async () => {
    if (!senseiProfile) return;

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
        .eq('id', senseiProfile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      setEditProfileOpen(false);
      fetchSenseiProfile(user.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const requestTripCreationPermission = async () => {
    if (!senseiProfile) return;

    try {
      const { error } = await supabase
        .from('sensei_profiles')
        .update({ 
          trip_creation_requested: true,
          trip_creation_request_date: new Date().toISOString()
        })
        .eq('id', senseiProfile.id);

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: "Your request for trip creation permission has been sent to the admin.",
      });

      fetchSenseiProfile(user.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send request.",
        variant: "destructive",
      });
    }
  };

  const handleCancelTrip = async () => {
    if (!selectedTripForCancel || !senseiProfile || !cancellationReason.trim()) return;

    try {
      // Create cancellation record
      const { error: cancellationError } = await supabase
        .from('trip_cancellations')
        .insert({
          trip_id: selectedTripForCancel.id,
          cancelled_by_sensei_id: senseiProfile.id,
          cancellation_reason: cancellationReason.trim(),
          admin_notified: false
        });

      if (cancellationError) throw cancellationError;

      // Update trip status
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          cancelled_by_sensei: true,
          cancellation_reason: cancellationReason.trim(),
          cancelled_at: new Date().toISOString(),
          replacement_needed: true
        })
        .eq('id', selectedTripForCancel.id);

      if (tripError) throw tripError;

      toast({
        title: "Trip Cancelled",
        description: "The trip has been cancelled and admin has been notified for replacement.",
      });

      setCancelTripOpen(false);
      setSelectedTripForCancel(null);
      setCancellationReason("");
      fetchSenseiTrips(user.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel trip.",
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

  if (!senseiProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">You don't have a sensei profile yet. Please apply to become a sensei first.</p>
              <Button onClick={() => window.location.href = '/become-sensei'} className="mt-4">
                Apply to Become a Sensei
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {senseiProfile.name}!
            </h1>
            <p className="text-lg text-gray-600">
              Manage your trips and profile from your dashboard
            </p>
          </div>
          <Button 
            onClick={() => setEditProfileOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trips</p>
                  <p className="text-2xl font-bold">{activeTrips}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Trips</p>
                  <p className="text-2xl font-bold">{upcomingTrips}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trips Completed</p>
                  <p className="text-2xl font-bold">{completedTrips}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Participants</p>
                  <p className="text-2xl font-bold">{totalParticipants}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="trips">My Trips</TabsTrigger>
            <TabsTrigger value="proposals">Trip Proposals</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="todos">To-Do List</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          {/* My Trips Tab */}
          <TabsContent value="trips" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Trips</h2>
              <Badge variant="outline" className="text-sm">
                {trips.length} total trips
              </Badge>
            </div>

            {trips.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trips assigned yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trips.map((trip) => (
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
                                <CalendarIcon className="w-4 h-4 mr-1" />
                                {trip.dates}
                              </p>
                            </div>
                             <div className="flex items-center gap-2">
                               <Badge variant={trip.is_active ? "default" : "secondary"}>
                                 {trip.is_active ? "Active" : "Inactive"}
                               </Badge>
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => window.location.href = `/sensei/trips`}
                               >
                                 <Edit2 className="w-4 h-4" />
                               </Button>
                               {trip.is_active && !trip.cancelled_by_sensei && (
                                 <Button 
                                   variant="destructive" 
                                   size="sm"
                                   onClick={() => {
                                     setSelectedTripForCancel(trip);
                                     setCancelTripOpen(true);
                                   }}
                                 >
                                   <X className="w-4 h-4" />
                                 </Button>
                               )}
                             </div>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Participants</p>
                              <p className="text-sm">{trip.current_participants}/{trip.max_participants}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Status</p>
                              <p className="text-sm">{trip.is_active ? "Active" : "Inactive"}</p>
                            </div>
                          </div>

                          {/* Paid Participants Section */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Confirmed Participants ({tripParticipants[trip.id]?.length || 0})
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchPaidParticipants(trip.id)}
                                disabled={loadingParticipants[trip.id]}
                              >
                                {loadingParticipants[trip.id] ? 'Loading...' : 'View Participants'}
                              </Button>
                            </div>
                            
                            {tripParticipants[trip.id] && (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {tripParticipants[trip.id].length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">No confirmed participants yet</p>
                                ) : (
                                  tripParticipants[trip.id].map((participant) => (
                                    <div key={participant.id} className="flex items-center justify-between p-3 bg-green-50 rounded text-sm border border-green-200">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                          <User className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                          <span className="font-medium text-green-800">{participant.customer_profiles.full_name}</span>
                                          {participant.customer_profiles.phone && (
                                            <div className="flex items-center gap-1 text-gray-600">
                                              <Phone className="w-3 h-3" />
                                              <span className="text-xs">{participant.customer_profiles.phone}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                          Paid
                                        </Badge>
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs text-gray-500">
                              * Only participants who have completed payment are shown
                            </div>
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
            {!senseiProfile?.can_create_trips ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Trip Creation Permission Required</h3>
                      <p className="text-gray-600 mb-4">
                        You need admin permission to create trip proposals. 
                        {senseiProfile?.trip_creation_requested 
                          ? " Your request is pending admin review."
                          : " Request permission to get started."
                        }
                      </p>
                      {senseiProfile?.trip_creation_requested ? (
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="secondary" className="px-4 py-2">
                            Request Pending
                          </Badge>
                          {senseiProfile.trip_creation_request_date && (
                            <p className="text-sm text-gray-500">
                              Requested on {new Date(senseiProfile.trip_creation_request_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button onClick={requestTripCreationPermission}>
                          Request Trip Creation Permission
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Trip Proposals</h2>
                  <Button 
                    onClick={() => setCreateTripOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Proposal
                  </Button>
                </div>

                {trips.filter(trip => trip.created_by_sensei).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-gray-600 mb-4">You haven't created any trip proposals yet.</p>
                      <Button onClick={() => setCreateTripOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Proposal
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {trips.filter(trip => trip.created_by_sensei).map((trip) => (
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
                                    <CalendarIcon className="w-4 h-4 mr-1" />
                                    {trip.dates}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={
                                      trip.trip_status === 'approved' ? 'default' :
                                      trip.trip_status === 'pending_approval' ? 'secondary' :
                                      trip.trip_status === 'draft' ? 'outline' : 'destructive'
                                    }
                                  >
                                    {trip.trip_status === 'pending_approval' ? 'Pending Review' : 
                                     trip.trip_status === 'approved' ? 'Approved' :
                                     trip.trip_status === 'draft' ? 'Draft' : 'Rejected'}
                                  </Badge>
                                  {(trip.trip_status === 'draft' || trip.trip_status === 'pending_approval') && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => window.location.href = `/sensei/trips`}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Status</p>
                                  <p className="text-sm capitalize">{trip.trip_status?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Duration</p>
                                  <p className="text-sm">{trip.duration_days} days</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Max Participants</p>
                                  <p className="text-sm">{trip.max_participants}</p>
                                </div>
                              </div>

                              {trip.trip_status === 'approved' && (
                                <div className="border-t pt-4">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">This trip is now live and accepting bookings!</span>
                                  </div>
                                </div>
                              )}

                              {trip.trip_status === 'rejected' && (
                                <div className="border-t pt-4">
                                  <div className="flex items-center gap-2 text-red-600">
                                    <X className="w-4 h-4" />
                                    <span className="text-sm font-medium">This proposal was not approved. Contact admin for feedback.</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Create Trip Proposal Dialog */}
                <Dialog open={createTripOpen} onOpenChange={setCreateTripOpen}>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Trip Proposal</DialogTitle>
                    </DialogHeader>
                    <TripProposalForm
                      senseiId={senseiProfile?.id}
                      onSuccess={() => {
                        setCreateTripOpen(false);
                        if (user) fetchSenseiTrips(user.id);
                      }}
                      onCancel={() => setCreateTripOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Messages</CardTitle>
                <CardDescription>Communicate with participants who have paid for your trips</CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No trips assigned yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {trips
                      .filter(trip => trip.is_active)
                      .map((trip) => (
                        <Card key={trip.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{trip.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {trip.destination} • {trip.dates}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Confirmed participants: {tripParticipants[trip.id]?.length || 'Load to see count'}
                                </p>
                              </div>
                              <Badge variant="default">Active Trip</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <TripMessagingEnhanced
                              tripId={trip.id}
                              tripTitle={trip.title}
                              userType="sensei"
                            />
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip & Availability Calendar</h2>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>🧳 Trips</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>🚫 Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span>💤 Offline</span>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div style={{ height: '600px' }}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={(event) => ({
                      style: {
                        backgroundColor: event.resource.color,
                        borderColor: event.resource.color,
                        color: 'white',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '12px',
                        padding: '2px 6px'
                      }
                    })}
                    onSelectEvent={(event) => {
                      let description = '';
                      if (event.resource.type === 'trip') {
                        description = `Trip to ${event.resource.destination} | ${event.resource.dates}`;
                      } else if (event.resource.type === 'unavailable') {
                        description = `You marked ${event.resource.month} as unavailable`;
                      } else if (event.resource.type === 'offline') {
                        description = 'Your profile is set to offline mode';
                      }
                      
                      toast({
                        title: event.title,
                        description: description,
                      });
                    }}
                    tooltipAccessor={(event) => {
                      if (event.resource.type === 'trip') {
                        return `${event.title} - ${event.resource.destination}`;
                      } else if (event.resource.type === 'unavailable') {
                        return `Unavailable: ${event.resource.month}`;
                      } else {
                        return event.title;
                      }
                    }}
                  />
                </div>
                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p>• <strong>Green events (🧳)</strong>: Your assigned trips</p>
                  <p>• <strong>Red events (🚫)</strong>: Months you've marked as unavailable</p>
                  <p>• <strong>Gray events (💤)</strong>: When your profile is offline</p>
                  <p>• Click any event for more details</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* To-Do List Tab */}
          <TabsContent value="todos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">To-Do List</h2>
              <Badge variant="outline" className="text-sm">
                {todos.filter(todo => !todo.completed).length} pending
              </Badge>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a new task..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                  />
                  <Button onClick={addTodo}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          todo.completed 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300'
                        }`}
                      >
                        {todo.completed && <CheckCircle className="w-3 h-3" />}
                      </button>
                      <span className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                        {todo.task}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No tasks yet. Add one above!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="space-y-6">
            <SenseiAvailabilitySettings />
          </TabsContent>
        </Tabs>

        {/* Cancel Trip Dialog */}
        <Dialog open={cancelTripOpen} onOpenChange={setCancelTripOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to cancel "{selectedTripForCancel?.title}"? 
                This will notify the admin so they can find a replacement Sensei.
              </p>
              <div>
                <Label htmlFor="cancellation-reason">Reason for cancellation *</Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Please explain why you need to cancel this trip..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setCancelTripOpen(false);
                  setSelectedTripForCancel(null);
                  setCancellationReason("");
                }}>
                  Keep Trip
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelTrip}
                  disabled={!cancellationReason.trim()}
                >
                  Cancel Trip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Profile</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="public" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="public">Public Information</TabsTrigger>
                <TabsTrigger value="admin">Admin Information</TabsTrigger>
              </TabsList>

              <TabsContent value="public" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profileFormData.name}
                      onChange={(e) => setProfileFormData({...profileFormData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Main Specialty</Label>
                    <Input
                      id="specialty"
                      value={profileFormData.specialty}
                      onChange={(e) => setProfileFormData({...profileFormData, specialty: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileFormData.location}
                      onChange={(e) => setProfileFormData({...profileFormData, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Experience</Label>
                    <Input
                      id="experience"
                      value={profileFormData.experience}
                      onChange={(e) => setProfileFormData({...profileFormData, experience: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileFormData.bio}
                    onChange={(e) => setProfileFormData({...profileFormData, bio: e.target.value})}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">Profile Image URL</Label>
                  <Input
                    id="image_url"
                    value={profileFormData.image_url}
                    onChange={(e) => setProfileFormData({...profileFormData, image_url: e.target.value})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileFormData.phone}
                      onChange={(e) => setProfileFormData({...profileFormData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profileFormData.email}
                      onChange={(e) => setProfileFormData({...profileFormData, email: e.target.value})}
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="availability">Availability Notes</Label>
                  <Textarea
                    id="availability"
                    value={profileFormData.availability}
                    onChange={(e) => setProfileFormData({...profileFormData, availability: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Admin Notes</Label>
                  <Textarea
                    id="notes"
                    value={profileFormData.notes}
                    onChange={(e) => setProfileFormData({...profileFormData, notes: e.target.value})}
                    rows={3}
                    placeholder="Internal notes for admin use..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 mt-6">
              <Button onClick={handleProfileUpdate}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SenseiDashboard;
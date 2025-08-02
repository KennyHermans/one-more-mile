import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Globe
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
      // First get the sensei profile to get the sensei ID
      const { data: profileData } = await supabase
        .from('sensei_profiles')
        .select('id')
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
      const events: CalendarEvent[] = (data || []).map(trip => {
        const dates = trip.dates.split(' - ');
        const startDate = new Date(dates[0]);
        const endDate = dates[1] ? new Date(dates[1]) : startDate;
        
        return {
          id: trip.id,
          title: trip.title,
          start: startDate,
          end: endDate,
          resource: trip
        };
      });
      
      setCalendarEvents(events);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trips">My Trips</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="todos">To-Do List</TabsTrigger>
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

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Calendar</h2>
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
                    onSelectEvent={(event) => {
                      toast({
                        title: event.title,
                        description: `Trip to ${event.resource.destination}`,
                      });
                    }}
                  />
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
        </Tabs>

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
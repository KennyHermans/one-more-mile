import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { DashboardAccessGuard } from "@/components/ui/dashboard-access-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { BackupSenseiManagement } from "@/components/ui/backup-sensei-management";
import { SenseiBackupRequests } from "@/components/ui/sensei-backup-requests";
import { SenseiCertificatesManagement } from "@/components/ui/sensei-certificates-management";
import { SenseiAnalyticsDashboard } from "@/components/ui/sensei-analytics-dashboard";
import { SenseiGoalsTracker } from "@/components/ui/sensei-goals-tracker";
import { SenseiSidebar } from "@/components/ui/sensei-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Enhanced Loading Components
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
  UserPlus
} from "lucide-react";

const localizer = momentLocalizer(moment);

interface Trip {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  group_size: string;
  program: any;
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  image_url: string;
  theme: string;
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

// New interfaces for Applications functionality
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

// Announcement interfaces
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

// New interfaces for Trips functionality  
interface TripPermissions {
  description?: boolean;
  program?: boolean;
  included_amenities?: boolean;
  excluded_items?: boolean;
  requirements?: boolean;
  dates?: boolean;
  price?: boolean;
  group_size?: boolean;
  title?: boolean;
  destination?: boolean;
  theme?: boolean;
}

interface ProgramDay {
  day: number;
  location: string;
  activities: string[];
  coordinates?: [number, number];
}

// Helper function to ensure program is always an array
const ensureProgramIsArray = (program: any): ProgramDay[] => {
  if (Array.isArray(program)) return program;
  if (typeof program === 'string') {
    try {
      const parsed = JSON.parse(program);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (program && typeof program === 'object') {
    // If it's an object but not an array, wrap it in an array
    return [program];
  }
  return [];
};

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
  const [activeTab, setActiveTab] = useState("overview");
  
  // New state for Applications functionality
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(false);
  
  // New state for Trips functionality
  const [permissions, setPermissions] = useState<{ [key: string]: TripPermissions }>({});
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  // New state for Announcements functionality
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
    // Admin-only fields
    phone: "",
    email: "",
    availability: "",
    notes: ""
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
      
      // Process trips to ensure program field is properly formatted
      const processedTrips = (data || []).map(trip => ({
        ...trip,
        program: ensureProgramIsArray(trip.program)
      }));
      
      setTrips(processedTrips);
      
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

  // Applications functionality (moved from MyApplications.tsx)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Trip permissions functionality (moved from SenseiTrips.tsx)
  const fetchTripPermissions = async (userId: string) => {
    try {
      // First get the sensei profile to get the sensei ID
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
        permissionsMap[p.trip_id] = p.permissions as TripPermissions;
      });
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const refreshPermissions = async () => {
    if (user) {
      await fetchTripPermissions(user.id);
      toast({
        title: "Permissions Refreshed",
        description: "Trip permissions have been updated.",
      });
    }
  };

  // Announcements functionality
  const fetchAnnouncements = async (userId: string) => {
    try {
      // First get the sensei profile to get the sensei ID
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
      
      // Get trip titles for trip-specific announcements
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

  const createAnnouncement = async () => {
    if (!senseiProfile || !announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          sensei_id: senseiProfile.id,
          title: announcementForm.title.trim(),
          content: announcementForm.content.trim(),
          priority: announcementForm.priority,
          trip_id: announcementForm.trip_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully!",
      });

      setCreateAnnouncementOpen(false);
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        trip_id: ''
      });
      fetchAnnouncements(user.id);
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive",
      });
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

  const toggleAnnouncementStatus = async (announcementId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', announcementId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Announcement ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });

      fetchAnnouncements(user.id);
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to update announcement.",
        variant: "destructive",
      });
    }
  };

  const canEdit = (tripId: string, field: keyof TripPermissions): boolean => {
    const result = permissions[tripId]?.[field] === true;
    console.log(`canEdit(${tripId}, ${field}):`, result, 'permissions:', permissions[tripId]);
    return result;
  };

  const handleSaveTrip = async () => {
    if (!editingTrip) return;

    try {
      // Store original trip data to compare changes
      const originalTrip = trips.find(trip => trip.id === editingTrip.id);
      
      const { error } = await supabase
        .from('trips')
        .update({
          title: editingTrip.title,
          destination: editingTrip.destination,
          description: editingTrip.description,
          price: editingTrip.price,
          dates: editingTrip.dates,
          group_size: editingTrip.group_size,
          program: editingTrip.program,
          included_amenities: editingTrip.included_amenities,
          excluded_items: editingTrip.excluded_items,
          requirements: editingTrip.requirements,
          theme: editingTrip.theme,
        })
        .eq('id', editingTrip.id);

      if (error) throw error;

      // Determine what changed
      const changes: { [key: string]: any } = {};
      if (originalTrip) {
        const fieldsToCheck = ['title', 'destination', 'description', 'price', 'dates', 'group_size', 'program', 'included_amenities', 'excluded_items', 'requirements', 'theme'];
        fieldsToCheck.forEach(field => {
          if (JSON.stringify(originalTrip[field as keyof Trip]) !== JSON.stringify(editingTrip[field as keyof Trip])) {
            changes[field] = {
              from: originalTrip[field as keyof Trip],
              to: editingTrip[field as keyof Trip]
            };
          }
        });
      }

      // Send notifications if there are changes
      if (Object.keys(changes).length > 0 && senseiProfile) {
        try {
          await supabase.functions.invoke('send-trip-update-notifications', {
            body: {
              tripId: editingTrip.id,
              senseiId: senseiProfile.id,
              changes: changes
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
          // Don't fail the trip update if notifications fail
        }
      }

      setTrips(trips.map(trip => 
        trip.id === editingTrip.id ? editingTrip : trip
      ));
      setEditingTrip(null);

      toast({
        title: "Success",
        description: "Trip updated successfully! Customers and admins have been notified.",
      });
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to update trip.",
        variant: "destructive",
      });
    }
  };

  const addProgramDay = () => {
    if (!editingTrip) return;
    const currentProgram = ensureProgramIsArray(editingTrip.program);
    const newDay: ProgramDay = {
      day: currentProgram.length + 1,
      location: "",
      activities: [""]
    };
    setEditingTrip({
      ...editingTrip,
      program: [...currentProgram, newDay]
    });
  };

  const updateProgramDay = (dayIndex: number, field: keyof ProgramDay, value: any) => {
    if (!editingTrip) return;
    const currentProgram = ensureProgramIsArray(editingTrip.program);
    const updatedProgram = [...currentProgram];
    if (updatedProgram[dayIndex]) {
      updatedProgram[dayIndex] = { ...updatedProgram[dayIndex], [field]: value };
      setEditingTrip({ ...editingTrip, program: updatedProgram });
    }
  };

  const addActivity = (dayIndex: number) => {
    if (!editingTrip) return;
    const currentProgram = ensureProgramIsArray(editingTrip.program);
    const updatedProgram = [...currentProgram];
    if (updatedProgram[dayIndex]) {
      updatedProgram[dayIndex].activities.push("");
      setEditingTrip({ ...editingTrip, program: updatedProgram });
    }
  };

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    if (!editingTrip) return;
    const currentProgram = ensureProgramIsArray(editingTrip.program);
    const updatedProgram = [...currentProgram];
    if (updatedProgram[dayIndex] && updatedProgram[dayIndex].activities) {
      updatedProgram[dayIndex].activities[activityIndex] = value;
      setEditingTrip({ ...editingTrip, program: updatedProgram });
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

      // Automatically assign backup sensei
      try {
        const { data: assignmentResult, error: assignmentError } = await supabase.functions.invoke(
          'assign-backup-sensei',
          {
            body: {
              tripId: selectedTripForCancel.id,
              cancellationReason: cancellationReason.trim(),
              originalSenseiName: senseiProfile.name
            }
          }
        );

        if (assignmentError) {
          console.error('Error assigning backup sensei:', assignmentError);
          toast({
            title: "Trip Cancelled",
            description: "Trip cancelled but there was an issue assigning backup sensei. Admin has been notified.",
            variant: "destructive",
          });
        } else if (assignmentResult?.success) {
          toast({
            title: "Trip Reassigned",
            description: `Trip cancelled and automatically reassigned to backup sensei: ${assignmentResult.backupSenseiName}`,
          });
        } else {
          toast({
            title: "Trip Cancelled",
            description: assignmentResult?.message || "Trip cancelled. Admin has been notified to find a replacement.",
          });
        }
      } catch (backupError) {
        console.error('Error in backup assignment:', backupError);
        toast({
          title: "Trip Cancelled",
          description: "Trip cancelled but backup assignment failed. Admin has been notified.",
          variant: "destructive",
        });
      }

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
    <DashboardAccessGuard requiredRole="sensei">
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

        <Tabs defaultValue="overview" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 xl:grid-cols-14 overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="trips">My Trips</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="availability">Settings</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="backup-sensei">Backup Sensei</TabsTrigger>
            <TabsTrigger value="trip-editor">Trip Editor</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium leading-none">Active Trips</p>
                      <p className="text-2xl font-bold">{activeTrips}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium leading-none">Trips Completed</p>
                      <p className="text-2xl font-bold">{completedTrips}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium leading-none">Upcoming Trips</p>
                      <p className="text-2xl font-bold">{upcomingTrips}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="ml-2">
                      <p className="text-sm font-medium leading-none">Total Participants</p>
                      <p className="text-2xl font-bold">{totalParticipants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setActiveTab("proposals")}
                  >
                    <Plus className="h-6 w-6" />
                    <span>Create Trip Proposal</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setActiveTab("messages")}
                  >
                    <MessageCircle className="h-6 w-6" />
                    <span>Message Participants</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setActiveTab("availability")}
                  >
                    <CalendarIcon className="h-6 w-6" />
                    <span>Update Availability</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <SenseiAnalyticsDashboard />
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <SenseiGoalsTracker />
          </TabsContent>

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
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setEditingTrip({ 
                                        ...trip, 
                                        program: ensureProgramIsArray(trip.program) 
                                      })}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <div className="flex justify-between items-center">
                                        <DialogTitle>Edit Trip: {editingTrip?.title}</DialogTitle>
                                        <Button
                                          onClick={refreshPermissions}
                                          variant="outline"
                                          size="sm"
                                        >
                                          Refresh Permissions
                                        </Button>
                                      </div>
                                    </DialogHeader>
                                    
                                    {editingTrip && (
                                      <div className="space-y-6">
                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label htmlFor="title">Title</Label>
                                            <Input
                                              id="title"
                                              value={editingTrip.title}
                                              onChange={(e) => setEditingTrip({...editingTrip, title: e.target.value})}
                                              disabled={!canEdit(editingTrip.id, 'title')}
                                            />
                                            {!canEdit(editingTrip.id, 'title') && (
                                              <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                            )}
                                          </div>

                                          <div>
                                            <Label htmlFor="destination">Destination</Label>
                                            <Input
                                              id="destination"
                                              value={editingTrip.destination}
                                              onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                                              disabled={!canEdit(editingTrip.id, 'destination')}
                                            />
                                            {!canEdit(editingTrip.id, 'destination') && (
                                              <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <Label htmlFor="description">Description</Label>
                                          <Textarea
                                            id="description"
                                            value={editingTrip.description}
                                            onChange={(e) => setEditingTrip({...editingTrip, description: e.target.value})}
                                            disabled={!canEdit(editingTrip.id, 'description')}
                                            rows={4}
                                          />
                                          {!canEdit(editingTrip.id, 'description') && (
                                            <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                          )}
                                        </div>

                                        {canEdit(editingTrip.id, 'program') && (
                                          <div>
                                            <div className="flex justify-between items-center mb-4">
                                              <Label>Daily Program</Label>
                                              <Button onClick={addProgramDay} variant="outline" size="sm">
                                                Add Day
                                              </Button>
                                            </div>
                                            <div className="space-y-4">
                                              {editingTrip.program?.map((day: ProgramDay, dayIndex: number) => (
                                                <Card key={dayIndex}>
                                                  <CardContent className="pt-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                      <div>
                                                        <Label>Day {day.day}</Label>
                                                      </div>
                                                      <div>
                                                        <Label>Location</Label>
                                                        <Input
                                                          value={day.location}
                                                          onChange={(e) => updateProgramDay(dayIndex, 'location', e.target.value)}
                                                        />
                                                      </div>
                                                    </div>
                                                    <div>
                                                      <div className="flex justify-between items-center mb-2">
                                                        <Label>Activities</Label>
                                                        <Button onClick={() => addActivity(dayIndex)} variant="outline" size="sm">
                                                          Add Activity
                                                        </Button>
                                                      </div>
                                                      <div className="space-y-2">
                                                        {day.activities?.map((activity: string, actIndex: number) => (
                                                          <Input
                                                            key={actIndex}
                                                            value={activity}
                                                            onChange={(e) => updateActivity(dayIndex, actIndex, e.target.value)}
                                                            placeholder={`Activity ${actIndex + 1}`}
                                                          />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {canEdit(editingTrip.id, 'included_amenities') && (
                                          <div>
                                            <Label htmlFor="included_amenities">Included Amenities</Label>
                                            <Textarea
                                              id="included_amenities"
                                              value={editingTrip.included_amenities?.join(', ') || ''}
                                              onChange={(e) => setEditingTrip({
                                                ...editingTrip, 
                                                included_amenities: e.target.value.split(',').map(item => item.trim()).filter(item => item.length > 0)
                                              })}
                                              placeholder="Enter amenities separated by commas"
                                              rows={3}
                                            />
                                          </div>
                                        )}

                                        <div className="flex justify-end space-x-2">
                                          <Button variant="outline" onClick={() => setEditingTrip(null)}>
                                            <X className="w-4 h-4 mr-2" />
                                            Cancel
                                          </Button>
                                          <Button onClick={handleSaveTrip}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                {trip.is_active && !trip.cancelled_by_sensei && (
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTripForCancel(trip);
                                      setCancelTripOpen(true);
                                    }}
                                  >
                                    Cancel my trip
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

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Messages</h2>
              <Badge variant="outline" className="text-sm">
                Communication with participants
              </Badge>
            </div>
            
            {trips.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No active trips to message participants.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {trips.filter(trip => trip.is_active).map((trip) => (
                  <Card key={trip.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{trip.title}</CardTitle>
                      <p className="text-sm text-gray-600">{trip.destination} • {trip.dates}</p>
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
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Calendar</h2>
              <Badge variant="outline" className="text-sm">
                Trip schedule & availability
              </Badge>
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
                        backgroundColor: event.resource?.color || '#3174ad',
                        borderColor: event.resource?.color || '#3174ad',
                      },
                    })}
                    views={['month', 'week', 'day']}
                    defaultView="month"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Todos Tab */}
          <TabsContent value="todos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Tasks & Todos</h2>
              <Badge variant="outline" className="text-sm">
                {todos.filter(todo => !todo.completed).length} pending
              </Badge>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Add New Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Enter a new task..."
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                  />
                  <Button onClick={addTodo}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {todos.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No tasks yet. Add your first task above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <Card key={todo.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="w-4 h-4"
                          />
                          <span className={todo.completed ? "line-through text-gray-500" : ""}>
                            {todo.task}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTodo(todo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trip Editor Tab */}
          <TabsContent value="trip-editor" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Editor</h2>
              <Badge variant="outline" className="text-sm">
                Edit trip details & program
              </Badge>
            </div>

            {trips.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No trips to edit.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trips.map((trip) => (
                  <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{trip.title}</h3>
                          <p className="text-gray-600">{trip.destination} • {trip.dates}</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full mt-4" 
                               onClick={() => setEditingTrip({ 
                                 ...trip, 
                                 program: ensureProgramIsArray(trip.program) 
                               })}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Trip
                            </Button>
                          </DialogTrigger>
                           <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                             <DialogHeader>
                               <div className="flex justify-between items-center">
                                 <DialogTitle>Edit Trip: {editingTrip?.title}</DialogTitle>
                                 <Button
                                   onClick={refreshPermissions}
                                   variant="outline"
                                   size="sm"
                                 >
                                   Refresh Permissions
                                 </Button>
                               </div>
                             </DialogHeader>
                            
                            {editingTrip && (
                              <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                      id="title"
                                      value={editingTrip.title}
                                      onChange={(e) => setEditingTrip({...editingTrip, title: e.target.value})}
                                      disabled={!canEdit(editingTrip.id, 'title')}
                                    />
                                    {!canEdit(editingTrip.id, 'title') && (
                                      <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="destination">Destination</Label>
                                    <Input
                                      id="destination"
                                      value={editingTrip.destination}
                                      onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                                      disabled={!canEdit(editingTrip.id, 'destination')}
                                    />
                                    {!canEdit(editingTrip.id, 'destination') && (
                                      <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="description">Description</Label>
                                  <Textarea
                                    id="description"
                                    value={editingTrip.description}
                                    onChange={(e) => setEditingTrip({...editingTrip, description: e.target.value})}
                                    disabled={!canEdit(editingTrip.id, 'description')}
                                    rows={4}
                                  />
                                  {!canEdit(editingTrip.id, 'description') && (
                                    <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                  )}
                                </div>

                                {/* Program */}
                                {canEdit(editingTrip.id, 'program') && (
                                  <div>
                                    <div className="flex justify-between items-center mb-4">
                                      <Label>Daily Program</Label>
                                      <Button onClick={addProgramDay} variant="outline" size="sm">
                                        Add Day
                                      </Button>
                                    </div>
                                    <div className="space-y-4">
                                      {editingTrip.program?.map((day: ProgramDay, dayIndex: number) => (
                                        <Card key={dayIndex}>
                                          <CardContent className="pt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                              <div>
                                                <Label>Day {day.day}</Label>
                                              </div>
                                              <div>
                                                <Label>Location</Label>
                                                <Input
                                                  value={day.location}
                                                  onChange={(e) => updateProgramDay(dayIndex, 'location', e.target.value)}
                                                />
                                              </div>
                                            </div>
                                            
                                            <div>
                                              <div className="flex justify-between items-center mb-2">
                                                <Label>Activities</Label>
                                                <Button onClick={() => addActivity(dayIndex)} variant="outline" size="sm">
                                                  Add Activity
                                                </Button>
                                              </div>
                                              <div className="space-y-2">
                                                {day.activities?.map((activity: string, activityIndex: number) => (
                                                  <Input
                                                    key={activityIndex}
                                                    value={activity}
                                                    onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                                                    placeholder={`Activity ${activityIndex + 1}`}
                                                  />
                                                ))}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Arrays */}
                                {canEdit(editingTrip.id, 'included_amenities') && (
                                  <div>
                                    <Label>Included Amenities (comma-separated)</Label>
                                    <Textarea
                                      value={editingTrip.included_amenities?.join(', ') || ''}
                                      onChange={(e) => setEditingTrip({
                                        ...editingTrip, 
                                        included_amenities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                      })}
                                      rows={3}
                                    />
                                  </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setEditingTrip(null)}>
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                  <Button onClick={handleSaveTrip}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Backup Sensei Tab */}
          <TabsContent value="backup-sensei" className="space-y-6">
            <BackupSenseiManagement isAdmin={false} />
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Applications</h2>
              <Badge variant="outline" className="text-sm">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {loadingApplications ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-lg">Loading your applications...</div>
                </CardContent>
              </Card>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600 mb-4">You haven't submitted any applications yet.</p>
                  <Button asChild>
                    <a href="/become-sensei">Submit Your First Application</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {applications.map((application) => (
                  <Card key={application.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{application.full_name}</CardTitle>
                          <p className="text-gray-600">{application.location}</p>
                          <p className="text-sm text-gray-500">
                            Submitted on {new Date(application.created_at).toLocaleDateString()}
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
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
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
                          <h4 className="font-semibold mb-2">Languages</h4>
                          <div className="flex flex-wrap gap-1">
                            {application.languages.slice(0, 3).map((language) => (
                              <Badge key={language} variant="outline" className="text-xs">
                                {language}
                              </Badge>
                            ))}
                            {application.languages.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{application.languages.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {application.bio}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Application Details Modal */}
            {selectedApplication && (
              <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedApplication.full_name} - Application Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedApplication.full_name}</h2>
                        <p className="text-gray-600">{selectedApplication.email}</p>
                      </div>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(selectedApplication.status)}`}>
                        {getStatusIcon(selectedApplication.status)}
                        {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
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
                              <Badge key={area} variant="secondary">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Languages</h3>
                          <div className="flex flex-wrap gap-1">
                            {selectedApplication.languages.map((language) => (
                              <Badge key={language} variant="outline">
                                {language}
                              </Badge>
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

                    <div className="pt-6 border-t">
                      <p className="text-sm text-gray-500">
                        Application submitted on {new Date(selectedApplication.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Trip Editor Tab */}
          <TabsContent value="trip-editor" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Trip Editor</h2>
              <Badge variant="outline" className="text-sm">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} to manage
              </Badge>
            </div>

            {trips.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No trips assigned to you yet. Contact the admin to get trips assigned.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <Card key={trip.id} className="overflow-hidden">
                    <div className="aspect-video relative">
                      <img
                        src={trip.image_url}
                        alt={trip.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{trip.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{trip.destination}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Dates:</strong> {trip.dates}</p>
                        <p><strong>Price:</strong> {trip.price}</p>
                        <p><strong>Group Size:</strong> {trip.group_size}</p>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full mt-4" 
                             onClick={() => setEditingTrip({ 
                               ...trip, 
                               program: ensureProgramIsArray(trip.program) 
                             })}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Trip
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Trip: {editingTrip?.title}</DialogTitle>
                          </DialogHeader>
                          
                          {editingTrip && (
                            <div className="space-y-6">
                              {/* Basic Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="title">Title</Label>
                                  <Input
                                    id="title"
                                    value={editingTrip.title}
                                    onChange={(e) => setEditingTrip({...editingTrip, title: e.target.value})}
                                    disabled={!canEdit(editingTrip.id, 'title')}
                                  />
                                  {!canEdit(editingTrip.id, 'title') && (
                                    <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                  )}
                                </div>
                                
                                <div>
                                  <Label htmlFor="destination">Destination</Label>
                                  <Input
                                    id="destination"
                                    value={editingTrip.destination}
                                    onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                                    disabled={!canEdit(editingTrip.id, 'destination')}
                                  />
                                  {!canEdit(editingTrip.id, 'destination') && (
                                    <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={editingTrip.description}
                                  onChange={(e) => setEditingTrip({...editingTrip, description: e.target.value})}
                                  disabled={!canEdit(editingTrip.id, 'description')}
                                  rows={4}
                                />
                                {!canEdit(editingTrip.id, 'description') && (
                                  <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                                )}
                              </div>

                              {/* Program */}
                              {canEdit(editingTrip.id, 'program') && (
                                <div>
                                  <div className="flex justify-between items-center mb-4">
                                    <Label>Daily Program</Label>
                                    <Button onClick={addProgramDay} variant="outline" size="sm">
                                      Add Day
                                    </Button>
                                  </div>
                                  <div className="space-y-4">
                                    {editingTrip.program?.map((day: ProgramDay, dayIndex: number) => (
                                      <Card key={dayIndex}>
                                        <CardContent className="pt-4">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                              <Label>Day {day.day}</Label>
                                            </div>
                                            <div>
                                              <Label>Location</Label>
                                              <Input
                                                value={day.location}
                                                onChange={(e) => updateProgramDay(dayIndex, 'location', e.target.value)}
                                              />
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <div className="flex justify-between items-center mb-2">
                                              <Label>Activities</Label>
                                              <Button onClick={() => addActivity(dayIndex)} variant="outline" size="sm">
                                                Add Activity
                                              </Button>
                                            </div>
                                            <div className="space-y-2">
                                              {day.activities?.map((activity: string, activityIndex: number) => (
                                                <Input
                                                  key={activityIndex}
                                                  value={activity}
                                                  onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                                                  placeholder={`Activity ${activityIndex + 1}`}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Arrays */}
                              {canEdit(editingTrip.id, 'included_amenities') && (
                                <div>
                                  <Label>Included Amenities (comma-separated)</Label>
                                  <Textarea
                                    value={editingTrip.included_amenities?.join(', ') || ''}
                                    onChange={(e) => setEditingTrip({
                                      ...editingTrip, 
                                      included_amenities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                    })}
                                    rows={3}
                                  />
                                </div>
                              )}

                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setEditingTrip(null)}>
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                                <Button onClick={handleSaveTrip}>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Certificates & Skills Tab */}
          <TabsContent value="certificates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Certificates & Skills</h2>
              <Badge variant="outline" className="text-sm">
                Manage your qualifications
              </Badge>
            </div>
            
            {senseiProfile?.id && (
              <SenseiCertificatesManagement senseiId={senseiProfile.id} />
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">News & Announcements</h2>
              <Button onClick={() => setCreateAnnouncementOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </div>

            {/* Admin Updates Section */}
            {adminAnnouncements.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                    Admin Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {adminAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        <Badge 
                          variant={
                            announcement.priority === 'urgent' ? 'destructive' :
                            announcement.priority === 'high' ? 'default' : 'secondary'
                          }
                        >
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-2">{announcement.content}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sensei's Own Announcements */}
            <div>
              <h3 className="text-lg font-semibold mb-4">My Announcements</h3>

            {announcements.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No announcements yet. Create your first announcement to keep participants informed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                            <Badge 
                              variant={
                                announcement.priority === 'urgent' ? 'destructive' :
                                announcement.priority === 'high' ? 'default' : 'secondary'
                              }
                            >
                              {announcement.priority}
                            </Badge>
                            <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                              {announcement.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {announcement.trip_id ? 
                              `Trip-specific: ${announcement.trips?.title || 'Unknown Trip'}` : 
                              'General announcement'
                            }
                          </p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(announcement.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant={announcement.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                        >
                          {announcement.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>

            {/* Create Announcement Dialog */}
            <Dialog open={createAnnouncementOpen} onOpenChange={setCreateAnnouncementOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="announcement-title">Title *</Label>
                    <Input
                      id="announcement-title"
                      placeholder="e.g., Don't forget to apply for your visa"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="announcement-content">Content *</Label>
                    <Textarea
                      id="announcement-content"
                      placeholder="Detailed information for participants..."
                      rows={4}
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="announcement-priority">Priority</Label>
                      <select
                        id="announcement-priority"
                        className="w-full p-2 border rounded-md"
                        value={announcementForm.priority}
                        onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value as 'normal' | 'high' | 'urgent'})}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="announcement-trip">Trip (Optional)</Label>
                      <select
                        id="announcement-trip"
                        className="w-full p-2 border rounded-md"
                        value={announcementForm.trip_id}
                        onChange={(e) => setAnnouncementForm({...announcementForm, trip_id: e.target.value})}
                      >
                        <option value="">All participants (General)</option>
                        {trips.filter(trip => trip.is_active).map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.title} - {trip.destination}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
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
                                      onClick={() => {/* Switch to trip-editor tab - functionality is in current page */}}
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
      </div>

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
    </DashboardAccessGuard>
  );
};

export default SenseiDashboard;
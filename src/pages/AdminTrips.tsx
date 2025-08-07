import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";
import { DragDropItineraryBuilder } from "@/components/ui/drag-drop-itinerary-builder";
import { TripTemplateManager } from "@/components/ui/trip-template-manager";
import { EnhancedMediaGallery } from "@/components/ui/enhanced-media-gallery";
import { WorkflowStatusManager } from "@/components/ui/workflow-status-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SenseiPermissionsDialog } from "@/components/ui/sensei-permissions-dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Loader2,
  ChevronDown,
  Settings,
  Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Trip, transformDbTrip, ProgramDay } from '@/types/trip';

// Helper function to get Mapbox token
const getMapboxToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.functions.invoke('get-mapbox-token');
    return data?.token || null;
  } catch (error) {
    console.error('Error getting Mapbox token:', error);
    return null;
  }
};

interface LocationInputProps {
  value: string;
  onChange: (location: string, coordinates?: [number, number]) => void;
  placeholder?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; coords: [number, number]; context: string }>>([]);
  const [loading, setLoading] = useState(false);

  const searchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getMapboxToken();
      if (!token) {
        console.error('No Mapbox token available');
        return;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5`
      );
      
      if (!response.ok) throw new Error('Geocoding request failed');
      
      const data = await response.json();
      
      const formattedSuggestions = data.features?.map((feature: any) => ({
        name: feature.place_name.split(',')[0],
        coords: feature.center as [number, number],
        context: feature.place_name
      })) || [];

      setSuggestions(formattedSuggestions);
      setIsOpen(formattedSuggestions.length > 0);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    const timeoutId = setTimeout(() => {
      searchLocations(inputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleLocationSelect = (location: { name: string; coords: [number, number]; context: string }) => {
    onChange(location.context, location.coords);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          placeholder={placeholder || "Search for any location worldwide..."}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
        />
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching locations...
            </div>
          )}
          {!loading && suggestions.map((location, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onMouseDown={() => handleLocationSelect(location)}
            >
              <div className="font-medium">{location.name}</div>
              <div className="text-xs text-muted-foreground">
                {location.context}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  location: string;
}

const AdminTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [approvedSenseiIds, setApprovedSenseiIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedTripForPermissions, setSelectedTripForPermissions] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    description: "",
    price: "",
    dates: "",
    start_date: null as Date | null,
    end_date: null as Date | null,
    group_size: "",
    sensei_name: "",
    sensei_id: null as string | null,
    backup_sensei_id: null as string | null,
    requires_backup_sensei: false,
    image_url: "",
    theme: "",
    rating: 0,
    duration_days: 1,
    difficulty_level: "Moderate",
    max_participants: 12,
    current_participants: 0,
    is_active: true,
    trip_status: "draft",
    program: [] as ProgramDay[],
    included_amenities: [] as string[],
    excluded_items: [] as string[],
    requirements: [] as string[],
    media_items: [] as any[]
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Auto-create the Mongolia trip
  const createMongoliaTrip = async () => {
    const mongoliaProgram = [
      {
        day: 1,
        title: "Arrival in Ulaanbaatar",
        description: "Airport pickup, UB Grand Hotel, gear fitting, safety briefing, welcome dinner",
        activities: ["Airport pickup", "Hotel check-in", "Gear fitting", "Safety briefing", "Welcome dinner"]
      },
      {
        day: 2,
        title: "Baga Gazar Rocks (280km)",
        description: "Granitic formations at 1751m, granite canyon exploration in the heart of the steppe",
        activities: ["280km ride", "Granite canyon exploration", "Rock formation photography", "Steppe camping"]
      },
      {
        day: 3,
        title: "White Stupa (230km)", 
        description: "Tsagaan Suvarga limestone formations, 400m long ancient ocean floor formations",
        activities: ["230km ride", "White limestone exploration", "Ancient ocean floor viewing", "Erosion formation study"]
      },
      {
        day: 4,
        title: "Ongi Monastery (220km)",
        description: "Historic monastery ruins housing over 1000 monks, sacred mountain hiking",
        activities: ["220km ride", "Monastery ruins exploration", "Sacred mountain hiking", "Historical site visit"]
      },
      {
        day: 5,
        title: "Husky Lodge - Sand Dunes (265km)",
        description: "Magical Husky Lodge in Elsen Tasarkhai, 80km long sand dunes exploration",
        activities: ["265km ride", "Sand dune exploration", "Husky Lodge accommodation", "Desert wildlife viewing"]
      },
      {
        day: 6,
        title: "Husky Lodge Loop (90km)",
        description: "Sand dune edge exploration, bonfire evening, optional camel/horseback riding",
        activities: ["90km loop ride", "Dune edge exploration", "Bonfire evening", "Camel/horse riding"]
      },
      {
        day: 7,
        title: "Hustai National Park (250km)",
        description: "Przewalski's Horse sanctuary, nomadic family visit, rock formations camping",
        activities: ["250km ride", "Wild horse viewing", "Nomadic family visit", "Traditional lifestyle experience"]
      },
      {
        day: 8,
        title: "Return to Ulaanbaatar (160km)",
        description: "Return to city, hotel rest, cashmere shopping, farewell hot pot dinner",
        activities: ["160km return ride", "Hotel shower & rest", "Cashmere shopping", "Farewell dinner"]
      },
      {
        day: 9,
        title: "Departure",
        description: "Airport transfer and departure",
        activities: ["Airport transfer", "Departure assistance", "Safe travels"]
      }
    ];

    try {
      const tripData = {
        title: "Mongolia Gobi Desert Adventure - 9 Day Motorcycle Tour",
        destination: "Gobi Desert, Mongolia",
        description: "The Gobi desert is one of the most beautiful places to visit in Mongolia. You will enjoy a combination of big sand hills, rocky mountains with old canyons, as well as wide forests consisting of small saxaul trees, riding all the way back to Ulaanbaatar through endless steppes. The Gobi is the fifth biggest desert in the world and is home to a wide range of animals such as antelopes and Bactrian camels. Experience dinosaur fossil sites, stunning sunrises, and hidden 'WHITE STUPA' rock formations millions of years old.",
        price: "€4,240",
        dates: "Available year-round",
        group_size: "Small groups",
        sensei_name: "",
        sensei_id: null,
        backup_sensei_id: null,
        requires_backup_sensei: true,
        image_url: "/lovable-uploads/gobi-desert-placeholder.jpg",
        theme: "Adventure Motorcycle Tour",
        rating: 0,
        duration_days: 9,
        difficulty_level: "Challenging",
        max_participants: 12,
        current_participants: 0,
        is_active: true,
        trip_status: "approved",
        program: JSON.stringify(mongoliaProgram),
        included_amenities: [
          "Airport pickup service",
          "Private support team", 
          "All meals during trip",
          "All camping gear",
          "Hotel night in Ulaanbaatar",
          "Ger camp costs",
          "National park entrance fees",
          "2 support vehicles (Toyota Land Cruiser)",
          "Guide, mechanic, chef, 2 assistants",
          "Husqvarna FE450 motorbike rent",
          "Gas, water, drinks, snacks"
        ],
        excluded_items: [
          "Flight expenses",
          "Visa cost", 
          "Health insurance",
          "Protective gear (€25/day rental available)"
        ],
        requirements: [
          "Valid motorcycle license",
          "Adventure riding experience",
          "Good physical fitness",
          "Valid passport",
          "Travel insurance recommended"
        ]
      };

      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Mongolia Gobi Desert Adventure trip created successfully!",
      });
      
      fetchTrips();
    } catch (error: any) {
      console.error('Error creating Mongolia trip:', error);
      toast({
        title: "Error",
        description: "Failed to create trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-create on component mount (only once)  
  useEffect(() => {
    if (user && trips.length === 0) {
      const timer = setTimeout(() => {
        createMongoliaTrip();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, trips]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate('/auth');
          return;
        }
        setUser(session.user);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTrips();
      fetchSenseis();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(trip => transformDbTrip(trip));
      setTrips(transformedData);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load trips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSenseis = async () => {
    try {
      const { data: senseiData, error: senseiError } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true);

      if (senseiError) throw senseiError;
      setSenseis(senseiData || []);

      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('user_id')
        .eq('status', 'approved');

      if (applicationError) throw applicationError;
      
      const approvedUserIds = new Set(applicationData?.map(app => app.user_id) || []);
      const approvedSenseiIds = new Set(
        senseiData?.filter(sensei => approvedUserIds.has(sensei.user_id))
                   .map(sensei => sensei.id) || []
      );
      
      setApprovedSenseiIds(approvedSenseiIds);
    } catch (error: any) {
      console.error('Error fetching senseis:', error);
      toast({
        title: "Error",
        description: "Failed to load sensei data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'sensei_id') {
      const selectedSensei = senseis.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        sensei_id: value || null,
        sensei_name: selectedSensei ? selectedSensei.name : ""
      }));
      return;
    }
    
    if (name === 'backup_sensei_id') {
      setFormData(prev => ({
        ...prev,
        backup_sensei_id: value || null
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked :
               value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      destination: "",
      description: "",
      price: "",
      dates: "",
      start_date: null,
      end_date: null,
      group_size: "",
      sensei_name: "",
      sensei_id: null,
      backup_sensei_id: null,
      requires_backup_sensei: false,
      image_url: "",
      theme: "",
      rating: 0,
      duration_days: 1,
      difficulty_level: "Moderate",
      max_participants: 12,
      current_participants: 0,
      is_active: true,
      trip_status: "draft",
      program: [],
      included_amenities: [],
      excluded_items: [],
      requirements: [],
      media_items: []
    });
    setDateRange(undefined);
    setEditingTrip(null);
  };

  const handleEditTrip = (trip: Trip) => {
    setFormData({
      title: trip.title,
      destination: trip.destination,
      description: trip.description,
      price: trip.price,
      dates: trip.dates,
      start_date: null,
      end_date: null,
      group_size: trip.group_size,
      sensei_name: trip.sensei_name,
      sensei_id: trip.sensei_id,
      backup_sensei_id: trip.backup_sensei_id || null,
      requires_backup_sensei: trip.requires_backup_sensei || false,
      image_url: trip.image_url,
      theme: trip.theme,
      rating: trip.rating,
      duration_days: trip.duration_days,
      difficulty_level: trip.difficulty_level,
      max_participants: trip.max_participants,
      current_participants: trip.current_participants,
      is_active: trip.is_active,
      trip_status: (trip as any).trip_status || "draft",
      program: trip.program || [],
      included_amenities: trip.included_amenities || [],
      excluded_items: trip.excluded_items || [],
      requirements: trip.requirements || [],
      media_items: (trip as any).media_items || []
    });

    setEditingTrip(trip);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let datesString = formData.dates;
      if (formData.start_date && formData.end_date) {
        datesString = `${format(formData.start_date, "MMMM d")} - ${format(formData.end_date, "MMMM d, yyyy")}`;
        const duration = differenceInDays(formData.end_date, formData.start_date) + 1;
        formData.duration_days = duration;
      }

      const { start_date, end_date, media_items, ...dbFormData } = formData;
      const tripData = {
        ...dbFormData,
        dates: datesString,
        start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
        program: JSON.stringify(formData.program)
      };

      if (editingTrip) {
        const { error } = await supabase
          .from('trips')
          .update(tripData)
          .eq('id', editingTrip.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Trip updated successfully!",
        });
      } else {
        const { error } = await supabase
          .from('trips')
          .insert([tripData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Trip created successfully!",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTrips();
    } catch (error: any) {
      console.error('Error saving trip:', error);
      toast({
        title: "Error",
        description: "Failed to save trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: "Failed to delete trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTrip = (trip: Trip) => {
    setFormData({
      title: `${trip.title} (Copy)`,
      destination: trip.destination,
      description: trip.description,
      price: trip.price,
      dates: "",
      start_date: null,
      end_date: null,
      group_size: trip.group_size,
      sensei_name: "",
      sensei_id: null,
      backup_sensei_id: null,
      requires_backup_sensei: false,
      image_url: trip.image_url,
      theme: trip.theme,
      rating: trip.rating,
      duration_days: trip.duration_days,
      difficulty_level: trip.difficulty_level,
      max_participants: trip.max_participants,
      current_participants: 0,
      is_active: false,
      trip_status: "draft",
      program: trip.program || [],
      included_amenities: trip.included_amenities || [],
      excluded_items: trip.excluded_items || [],
      requirements: trip.requirements || [],
      media_items: []
    });

    setDateRange(undefined);
    setEditingTrip(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading trips...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminAccessGuard>
      <div className="min-h-screen bg-background">
        <Navigation />
      
        <div className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold">Manage Trips</h1>
              <p className="text-muted-foreground">Enhanced trip management with AI-powered tools</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrip ? 'Edit Trip' : 'Create New Trip'}
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title *</label>
                          <Input
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Trip title"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Destination *</label>
                          <LocationInput
                            value={formData.destination}
                            onChange={(location) => setFormData(prev => ({ ...prev, destination: location }))}
                            placeholder="Search destinations worldwide..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Description *</label>
                        <Textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Trip description"
                          rows={3}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Price *</label>
                          <Input
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            placeholder="$2,999"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Theme</label>
                          <Input
                            name="theme"
                            value={formData.theme}
                            onChange={handleInputChange}
                            placeholder="Adventure theme"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Difficulty</label>
                          <select
                            name="difficulty_level"
                            value={formData.difficulty_level}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Challenging">Challenging</option>
                            <option value="Extreme">Extreme</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Primary Sensei</label>
                          <select
                            name="sensei_id"
                            value={formData.sensei_id || ""}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select a sensei</option>
                            {senseis.filter(sensei => approvedSenseiIds.has(sensei.id)).map((sensei) => (
                              <option key={sensei.id} value={sensei.id}>
                                {sensei.name} - {sensei.specialty}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Max Participants</label>
                          <Input
                            name="max_participants"
                            type="number"
                            value={formData.max_participants}
                            onChange={handleInputChange}
                            min="1"
                            max="50"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="rounded"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">
                          Active (visible to users)
                        </label>
                      </div>
                    </TabsContent>

                    <TabsContent value="itinerary" className="space-y-4">
                      <DragDropItineraryBuilder
                        program={formData.program}
                        onChange={(newProgram) => setFormData(prev => ({ ...prev, program: newProgram }))}
                      />
                    </TabsContent>

                    <TabsContent value="media" className="space-y-4">
                      <EnhancedMediaGallery
                        tripId={editingTrip?.id}
                        mediaItems={formData.media_items}
                        onMediaUpdate={(newItems) => setFormData(prev => ({ ...prev, media_items: newItems }))}
                      />
                    </TabsContent>

                    <TabsContent value="templates" className="space-y-4">
                      <TripTemplateManager
                        currentTripData={formData}
                        onApplyTemplate={(templateData) => {
                          setFormData(prev => ({
                            ...prev,
                            ...templateData,
                            title: templateData.title || prev.title,
                            program: templateData.program || prev.program
                          }));
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="workflow" className="space-y-4">
                      {editingTrip ? (
                        <WorkflowStatusManager
                          tripId={editingTrip.id}
                          currentStatus={(editingTrip as any).trip_status || "draft"}
                          onStatusChange={(newStatus) => {
                            setFormData(prev => ({ ...prev, trip_status: newStatus }));
                          }}
                          canManageWorkflow={true}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Save the trip first to manage workflow status
                        </div>
                      )}
                    </TabsContent>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {editingTrip ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingTrip ? 'Update Trip' : 'Create Trip'
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="group hover:shadow-lg transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={trip.image_url} 
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge variant={trip.is_active ? "default" : "secondary"}>
                      {trip.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">{trip.theme}</Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center bg-black/50 rounded-full px-2 py-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-white text-sm">{trip.rating}</span>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-2">{trip.title}</CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-1 h-4 w-4" />
                    {trip.destination}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-semibold">{trip.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{trip.duration_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="outline" className="text-xs">
                        {(trip as any).trip_status || "draft"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Participants:</span>
                      <span>{trip.current_participants}/{trip.max_participants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Primary Sensei:</span>
                      <span className="font-medium">
                        {trip.sensei_name || <Badge variant="outline" className="text-xs">Unassigned</Badge>}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditTrip(trip)}
                      className="flex-1"
                    >
                      <Edit2 className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDuplicateTrip(trip)}
                      title="Duplicate Trip"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {trip.sensei_id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTripForPermissions(trip.id);
                          setPermissionsDialogOpen(true);
                        }}
                        title="Manage Sensei Permissions"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {trips.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No trips yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first trip with the enhanced builder to get started.
              </p>
            </div>
          )}

          <SenseiPermissionsDialog
            tripId={selectedTripForPermissions}
            isOpen={permissionsDialogOpen}
            onClose={() => {
              setPermissionsDialogOpen(false);
              setSelectedTripForPermissions("");
            }}
            onSave={() => {
              toast({
                title: "Success",
                description: "Sensei permissions updated successfully!",
              });
            }}
          />
        </div>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminTrips;
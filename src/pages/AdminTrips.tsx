import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  MapPin,
  Calendar,
  Users,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useNavigate } from "react-router-dom";

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
}

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
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    description: "",
    price: "",
    dates: "",
    group_size: "",
    sensei_name: "",
    sensei_id: null as string | null,
    image_url: "",
    theme: "",
    rating: 0,
    duration_days: 1,
    difficulty_level: "Moderate",
    max_participants: 12,
    current_participants: 0,
    is_active: true
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user || session.user.email !== 'kenny_hermans93@hotmail.com') {
        navigate('/');
        return;
      }
      
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user || session.user.email !== 'kenny_hermans93@hotmail.com') {
          navigate('/');
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
      setTrips(data || []);
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
      // Fetch sensei profiles
      const { data: senseiData, error: senseiError } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true);

      if (senseiError) throw senseiError;
      setSenseis(senseiData || []);

      // Fetch approved applications
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('user_id')
        .eq('status', 'approved');

      if (applicationError) throw applicationError;
      
      // Create a set of approved user IDs for quick lookup
      const approvedUserIds = new Set(applicationData?.map(app => app.user_id) || []);
      
      // Find sensei profiles that have approved applications
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
    
    // Handle sensei selection
    if (name === 'sensei_id') {
      const selectedSensei = senseis.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        sensei_id: value || null,
        sensei_name: selectedSensei ? selectedSensei.name : ""
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
      group_size: "",
      sensei_name: "",
      sensei_id: null,
      image_url: "",
      theme: "",
      rating: 0,
      duration_days: 1,
      difficulty_level: "Moderate",
      max_participants: 12,
      current_participants: 0,
      is_active: true
    });
    setEditingTrip(null);
  };

  const handleEditTrip = (trip: Trip) => {
    setFormData({
      title: trip.title,
      destination: trip.destination,
      description: trip.description,
      price: trip.price,
      dates: trip.dates,
      group_size: trip.group_size,
      sensei_name: trip.sensei_name,
      sensei_id: trip.sensei_id,
      image_url: trip.image_url,
      theme: trip.theme,
      rating: trip.rating,
      duration_days: trip.duration_days,
      difficulty_level: trip.difficulty_level,
      max_participants: trip.max_participants,
      current_participants: trip.current_participants,
      is_active: trip.is_active
    });
    setEditingTrip(trip);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTrip) {
        // Update existing trip
        const { error } = await supabase
          .from('trips')
          .update(formData)
          .eq('id', editingTrip.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Trip updated successfully!",
        });
      } else {
        // Create new trip
        const { error } = await supabase
          .from('trips')
          .insert([formData]);

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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Manage Trips</h1>
            <p className="text-muted-foreground">Add, edit, and manage adventure trips</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTrip ? 'Edit Trip' : 'Add New Trip'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Input
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      placeholder="Trip destination"
                      required
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
                    <label className="block text-sm font-medium mb-2">Dates *</label>
                    <Input
                      name="dates"
                      value={formData.dates}
                      onChange={handleInputChange}
                      placeholder="Apr 15-28, 2024"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Group Size *</label>
                    <Input
                      name="group_size"
                      value={formData.group_size}
                      onChange={handleInputChange}
                      placeholder="8-12 people"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Sensei</label>
                    <select
                      name="sensei_id"
                      value={formData.sensei_id || ""}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                    >
                      <option value="">Select an approved Sensei</option>
                      {senseis
                        .filter(sensei => approvedSenseiIds.has(sensei.id))
                        .map(sensei => (
                          <option key={sensei.id} value={sensei.id}>
                            {sensei.name} - {sensei.specialty} ({sensei.location})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sensei Name (Auto-filled)</label>
                    <Input
                      name="sensei_name"
                      value={formData.sensei_name}
                      onChange={handleInputChange}
                      placeholder="Will be auto-filled when Sensei is selected"
                      readOnly={formData.sensei_id !== null}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Theme *</label>
                    <select
                      name="theme"
                      value={formData.theme}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      required
                    >
                      <option value="">Select theme</option>
                      <option value="Wellness">Wellness</option>
                      <option value="Culinary">Culinary</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Sports">Sports</option>
                      <option value="Adventure">Adventure</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image URL *</label>
                  <Input
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    placeholder="https://images.unsplash.com/..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      name="rating"
                      value={formData.rating}
                      onChange={handleInputChange}
                      placeholder="4.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (days)</label>
                    <Input
                      type="number"
                      min="1"
                      name="duration_days"
                      value={formData.duration_days}
                      onChange={handleInputChange}
                      placeholder="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty</label>
                    <select
                      name="difficulty_level"
                      value={formData.difficulty_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Challenging">Challenging</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Participants</label>
                    <Input
                      type="number"
                      min="1"
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleInputChange}
                      placeholder="12"
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

                <div className="flex gap-2 pt-4">
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
                    <span>Difficulty:</span>
                    <Badge variant="outline" className="text-xs">
                      {trip.difficulty_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>{trip.current_participants}/{trip.max_participants}</span>
                  </div>
                </div>

                <div className="flex gap-2">
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
              Create your first trip to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrips;
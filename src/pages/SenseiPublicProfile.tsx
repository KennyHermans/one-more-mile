import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Users, Award, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  image_url: string | null;
  rating: number;
  trips_led: number;
  experience: string;
  location: string;
  specialties: string[];
  is_active: boolean;
}

import { Trip } from '@/types/trip';
import { createMockTrip } from '@/types/trip-utils';

const SenseiPublicProfile = () => {
  const { senseiId } = useParams<{ senseiId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sensei, setSensei] = useState<SenseiProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (senseiId) {
      fetchSenseiProfile(senseiId);
      fetchSenseiTrips(senseiId);
    }
  }, [senseiId]);

  const fetchSenseiProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Sensei Not Found",
            description: "The requested sensei profile could not be found.",
            variant: "destructive",
          });
          navigate('/senseis');
          return;
        }
        throw error;
      }

      setSensei(data);
    } catch (error) {
      console.error('Error fetching sensei profile:', error);
      toast({
        title: "Error",
        description: "Failed to load sensei profile.",
        variant: "destructive",
      });
    }
  };

  const fetchSenseiTrips = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, rating, image_url')
        .eq('sensei_id', id)
        .eq('is_active', true)
        .eq('trip_status', 'approved')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      // Transform partial trip data to full Trip objects
      const transformedTrips = (data || []).map(trip => createMockTrip({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        rating: trip.rating,
        image_url: trip.image_url
      }));
      setTrips(transformedTrips);
    } catch (error) {
      console.error('Error fetching sensei trips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <p className="font-sans text-lg text-muted-foreground">Loading Sensei Profile...</p>
        </div>
      </div>
    );
  }

  if (!sensei) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <p className="font-sans text-lg text-muted-foreground">Sensei profile not found.</p>
          <Button onClick={() => navigate('/senseis')} className="mt-4">
            Back to Senseis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8">
        <Button 
          variant="outline" 
          onClick={() => navigate('/senseis')}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Senseis
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-secondary">
                    <img 
                      src={sensei.image_url || "https://images.unsplash.com/photo-1494790108755-2616b612b385?w=400&h=400&fit=crop&crop=face"} 
                      alt={sensei.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h1 className="font-serif text-2xl font-bold text-foreground mb-2">{sensei.name}</h1>
                  <Badge variant="secondary" className="mb-3">{sensei.specialty}</Badge>
                  
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-sans font-medium">{sensei.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-sans text-sm">{sensei.trips_led} trips led</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span className="font-sans text-sm">{sensei.location}</span>
                  </div>

                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="font-sans text-sm">{sensei.experience} experience</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-sans font-semibold text-foreground mb-2">About</h3>
                    <p className="font-sans text-muted-foreground leading-relaxed">{sensei.bio}</p>
                  </div>

                  <div>
                    <h3 className="font-sans font-semibold text-foreground mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {sensei.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="font-sans text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trips Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Featured Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <p className="font-sans text-muted-foreground text-center py-8">
                    No trips available from this Sensei yet.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {trips.map((trip) => (
                      <Card key={trip.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => navigate(`/trip/${trip.id}`)}>
                        <div className="relative">
                          <img 
                            src={trip.image_url} 
                            alt={trip.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                          <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1 flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                            <span className="font-sans text-xs font-medium">{trip.rating}</span>
                          </div>
                        </div>
                        <CardContent className="pt-4">
                          <h4 className="font-serif font-semibold text-foreground mb-2">{trip.title}</h4>
                          <p className="font-sans text-sm text-muted-foreground flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {trip.destination}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SenseiPublicProfile;
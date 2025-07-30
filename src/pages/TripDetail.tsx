import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  max_participants: number;
  current_participants: number;
}

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  experience: string;
  location: string;
  image_url: string | null;
  rating: number;
  trips_led: number;
}

const TripDetail = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [senseiProfile, setSenseiProfile] = useState<SenseiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Trip Not Found",
            description: "The trip you're looking for doesn't exist.",
            variant: "destructive",
          });
          return;
        }

        setTrip(data);

        // Fetch sensei profile if linked
        if (data.sensei_id) {
          const { data: senseiData, error: senseiError } = await supabase
            .from('sensei_profiles')
            .select('*')
            .eq('id', data.sensei_id)
            .maybeSingle();

          if (senseiError) {
            console.error('Error fetching sensei profile:', senseiError);
          } else {
            setSenseiProfile(senseiData);
          }
        }
      } catch (error: any) {
        console.error('Error fetching trip:', error);
        toast({
          title: "Error",
          description: "Failed to load trip details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
          <Button asChild>
            <Link to="/explore">Back to Explore</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Image */}
      <section className="relative h-[60vh] overflow-hidden">
        <img 
          src={trip.image_url} 
          alt={trip.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute top-6 left-6">
          <Button asChild variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
            <Link to="/explore">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Explore
            </Link>
          </Button>
        </div>

        <div className="absolute bottom-8 left-8 text-white">
          <Badge variant="secondary" className="bg-white/90 text-primary mb-4">
            {trip.theme}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
            {trip.title}
          </h1>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {trip.destination}
            </div>
            <div className="flex items-center">
              <Star className="mr-1 h-5 w-5 text-yellow-400 fill-current" />
              {trip.rating}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-3xl font-bold mb-4">About This Adventure</h2>
                <p className="font-sans text-lg text-muted-foreground leading-relaxed">
                  {trip.description}
                </p>
              </div>

              {/* What's Included */}
              {trip.included_amenities && trip.included_amenities.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
                      What's Included
                    </h3>
                    <ul className="space-y-2">
                      {trip.included_amenities.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* What's Not Included */}
              {trip.excluded_items && trip.excluded_items.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <XCircle className="mr-2 h-6 w-6 text-red-500" />
                      What's Not Included
                    </h3>
                    <ul className="space-y-2">
                      {trip.excluded_items.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <XCircle className="mr-2 h-4 w-4 text-red-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Requirements */}
              {trip.requirements && trip.requirements.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center">
                      <AlertCircle className="mr-2 h-6 w-6 text-yellow-500" />
                      Requirements
                    </h3>
                    <ul className="space-y-2">
                      {trip.requirements.map((item, index) => (
                        <li key={index} className="flex items-center font-sans">
                          <AlertCircle className="mr-2 h-4 w-4 text-yellow-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary">{trip.price}</div>
                    <div className="text-sm text-muted-foreground">per person</div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Dates</span>
                      </div>
                      <span className="text-sm font-medium">{trip.dates}</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Group Size</span>
                      </div>
                      <span className="text-sm font-medium">{trip.group_size}</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <span className="text-sm font-medium">{trip.duration_days} days</span>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Difficulty</span>
                      <Badge variant={
                        trip.difficulty_level === 'Easy' ? 'secondary' :
                        trip.difficulty_level === 'Moderate' ? 'default' : 'destructive'
                      }>
                        {trip.difficulty_level}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Sensei</span>
                      <div className="text-right">
                        <span className="text-sm font-medium block">{trip.sensei_name}</span>
                        {senseiProfile && (
                          <span className="text-xs text-muted-foreground">
                            {senseiProfile.specialty} • {senseiProfile.trips_led} trips led
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-sm">Availability</span>
                      <span className="text-sm font-medium">
                        {trip.current_participants}/{trip.max_participants} spots
                      </span>
                    </div>
                  </div>

                  <Button className="w-full font-sans font-medium" size="lg">
                    Book This Adventure
                  </Button>

                  <div className="mt-4 text-center">
                    <Button variant="outline" className="w-full font-sans">
                      Contact for Custom Date
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sensei Profile Card */}
              {senseiProfile && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl font-bold mb-4">Your Sensei</h3>
                    <div className="flex items-start space-x-4">
                      {senseiProfile.image_url && (
                        <img 
                          src={senseiProfile.image_url} 
                          alt={senseiProfile.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-sans font-semibold text-lg">{senseiProfile.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{senseiProfile.specialty}</p>
                        <p className="text-sm font-sans leading-relaxed mb-3">
                          {senseiProfile.bio.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Star className="mr-1 h-3 w-3 text-yellow-400 fill-current" />
                            {senseiProfile.rating}
                          </div>
                          <span>{senseiProfile.trips_led} trips led</span>
                          <span>{senseiProfile.location}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TripDetail;
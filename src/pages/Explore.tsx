import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, Users, Star, Loader2 } from "lucide-react";
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
  image_url: string;
  theme: string;
  rating: number;
}

const Explore = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
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

  // Filter trips based on search and filters
  const filteredTrips = trips.filter(trip => {
    const matchesSearch = searchQuery === "" || 
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTheme = selectedTheme === "" || trip.theme.toLowerCase() === selectedTheme;
    
    const matchesDestination = selectedDestination === "" || 
      (selectedDestination === "asia" && (trip.destination.toLowerCase().includes("nepal") || trip.destination.toLowerCase().includes("asia"))) ||
      (selectedDestination === "europe" && (trip.destination.toLowerCase().includes("italy") || trip.destination.toLowerCase().includes("swiss") || trip.destination.toLowerCase().includes("europe"))) ||
      (selectedDestination === "africa" && trip.destination.toLowerCase().includes("africa")) ||
      (selectedDestination === "americas" && (trip.destination.toLowerCase().includes("america") || trip.destination.toLowerCase().includes("usa") || trip.destination.toLowerCase().includes("canada")));

    return matchesSearch && matchesTheme && matchesDestination;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading adventures...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
              Explore Adventures
            </h1>
            <p className="font-sans text-xl max-w-2xl mx-auto leading-relaxed">
              Discover transformative journeys led by expert Senseis around the world
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input 
                  placeholder="Search destinations or activities..."
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="bg-white/20 border border-white/30 text-white rounded-lg px-4 py-2 backdrop-blur-sm"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
              >
                <option value="" className="text-foreground bg-background">All Themes</option>
                <option value="sports" className="text-foreground bg-background">Sports</option>
                <option value="culinary" className="text-foreground bg-background">Culinary</option>
                <option value="wellness" className="text-foreground bg-background">Wellness</option>
                <option value="cultural" className="text-foreground bg-background">Cultural</option>
              </select>
              <select 
                className="bg-white/20 border border-white/30 text-white rounded-lg px-4 py-2 backdrop-blur-sm"
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
              >
                <option value="" className="text-foreground bg-background">All Destinations</option>
                <option value="asia" className="text-foreground bg-background">Asia</option>
                <option value="europe" className="text-foreground bg-background">Europe</option>
                <option value="africa" className="text-foreground bg-background">Africa</option>
                <option value="americas" className="text-foreground bg-background">Americas</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Trip Cards */}
      <section className="py-16">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Available Adventures
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-sans text-muted-foreground">{filteredTrips.length} trips found</span>
            </div>
          </div>
          
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or check back later for new adventures.
              </p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedTheme("");
                setSelectedDestination("");
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredTrips.map((trip) => (
                <Card key={trip.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={trip.image_url} 
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90 text-primary">
                        {trip.theme}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center bg-white/90 rounded-full px-2 py-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                      <span className="font-sans text-sm font-medium">{trip.rating}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span className="font-sans text-sm font-medium">{trip.destination}</span>
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                      {trip.title}
                    </CardTitle>
                    <p className="font-sans text-muted-foreground line-clamp-2">{trip.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 font-sans">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{trip.dates}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{trip.group_size}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Led by Sensei {trip.sensei_name}</p>
                        <p className="text-lg font-bold text-primary">{trip.price}</p>
                      </div>
                      <Button asChild className="font-medium">
                        <Link to={`/trip/${trip.id}`}>Learn More</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;
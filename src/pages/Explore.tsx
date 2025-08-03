import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, Users, Star, Loader2, SlidersHorizontal, X } from "lucide-react";
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
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [maxGroupSize, setMaxGroupSize] = useState(50);
  const [sortBy, setSortBy] = useState("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  // Extract price number from price string (e.g., "$2,500" -> 2500)
  const extractPrice = (priceStr: string) => {
    const price = priceStr.replace(/[^0-9]/g, '');
    return parseInt(price) || 0;
  };

  // Extract group size number (e.g., "8-12 people" -> 12)
  const extractGroupSize = (groupStr: string) => {
    const numbers = groupStr.match(/\d+/g);
    return numbers ? Math.max(...numbers.map(n => parseInt(n))) : 0;
  };

  // Filter and sort trips
  const filteredAndSortedTrips = trips
    .filter(trip => {
      const matchesSearch = searchQuery === "" || 
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.sensei_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTheme = selectedTheme === "" || trip.theme.toLowerCase() === selectedTheme.toLowerCase();
      
      const matchesDestination = selectedDestination === "" || 
        (selectedDestination === "asia" && (trip.destination.toLowerCase().includes("nepal") || trip.destination.toLowerCase().includes("asia"))) ||
        (selectedDestination === "europe" && (trip.destination.toLowerCase().includes("italy") || trip.destination.toLowerCase().includes("swiss") || trip.destination.toLowerCase().includes("europe"))) ||
        (selectedDestination === "africa" && trip.destination.toLowerCase().includes("africa")) ||
        (selectedDestination === "americas" && (trip.destination.toLowerCase().includes("america") || trip.destination.toLowerCase().includes("usa") || trip.destination.toLowerCase().includes("canada")));

      const tripPrice = extractPrice(trip.price);
      const matchesPrice = tripPrice >= priceRange[0] && tripPrice <= priceRange[1];
      
      const matchesRating = trip.rating >= minRating;
      
      const tripGroupSize = extractGroupSize(trip.group_size);
      const matchesGroupSize = tripGroupSize <= maxGroupSize;

      return matchesSearch && matchesTheme && matchesDestination && matchesPrice && matchesRating && matchesGroupSize;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return extractPrice(a.price) - extractPrice(b.price);
        case "price-high":
          return extractPrice(b.price) - extractPrice(a.price);
        case "rating":
          return b.rating - a.rating;
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return new Date(b.dates).getTime() - new Date(a.dates).getTime();
      }
    });

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTheme("");
    setSelectedDestination("");
    setPriceRange([0, 10000]);
    setMinRating(0);
    setMaxGroupSize(50);
    setSortBy("newest");
  };

  const activeFiltersCount = [
    searchQuery,
    selectedTheme,
    selectedDestination,
    priceRange[0] > 0 || priceRange[1] < 10000,
    minRating > 0,
    maxGroupSize < 50
  ].filter(Boolean).length;

  const TripSkeleton = () => (
    <Card className="overflow-hidden">
      <Skeleton className="h-64 w-full" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
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
          </div>
        </section>
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <TripSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
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
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input 
                  placeholder="Search trips, destinations, senseis..."
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
                  <SelectValue placeholder="All Themes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Themes</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="culinary">Culinary</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
                  <SelectValue placeholder="All Destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Destinations</SelectItem>
                  <SelectItem value="asia">Asia</SelectItem>
                  <SelectItem value="europe">Europe</SelectItem>
                  <SelectItem value="africa">Africa</SelectItem>
                  <SelectItem value="americas">Americas</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>

            {showAdvancedFilters && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label className="text-white font-medium">Price Range</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10000}
                      min={0}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-white/70">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white font-medium">Minimum Rating</Label>
                    <Slider
                      value={[minRating]}
                      onValueChange={(value) => setMinRating(value[0])}
                      max={5}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="text-sm text-white/70">
                      {minRating}+ stars
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white font-medium">Max Group Size</Label>
                    <Slider
                      value={[maxGroupSize]}
                      onValueChange={(value) => setMaxGroupSize(value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-sm text-white/70">
                      Up to {maxGroupSize} people
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <Button
                    variant="ghost"
                    onClick={clearAllFilters}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 bg-white/20 border-white/30 text-white">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="alphabetical">A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="font-sans text-muted-foreground">{filteredAndSortedTrips.length} trips found</span>
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="font-sans"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {filteredAndSortedTrips.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No trips found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or check back later for new adventures.
              </p>
              <Button onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredAndSortedTrips.map((trip) => (
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
          
          {/* Call to Action for Becoming a Sensei */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 border border-primary/20">
              <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
                Want to create your own unique trip?
              </h3>
              <p className="font-sans text-muted-foreground mb-6 max-w-md mx-auto">
                Share your expertise and passion by becoming a Sensei and leading your own transformative adventures.
              </p>
              <Button asChild size="lg" className="font-medium">
                <Link to="/become-sensei">Become a Sensei</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Explore;
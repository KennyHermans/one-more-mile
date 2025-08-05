import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { TripComparison } from "@/components/ui/trip-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFilters } from "@/components/ui/search-filters";
import { TripMapView } from "@/components/ui/trip-map-view";
import { EnhancedTripCardSkeleton } from "@/components/ui/enhanced-trip-skeletons";
import { SearchFiltersSkeleton } from "@/components/ui/enhanced-ui-skeletons";
import { AdventureLoadingState } from "@/components/ui/enhanced-loading-states";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, Users, Star, Loader2, ArrowUpDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trip, TripListItem, toTripListItem, transformDbTrip } from '@/types/trip';

interface FilterState {
  searchQuery: string;
  themes: string[];
  destinations: string[];
  priceRange: [number, number];
  minRating: number;
  groupSize: [number, number];
  duration: string;
  difficulty: string[];
  dates: {
    from?: Date;
    to?: Date;
  };
}

const Explore = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [comparisonTrips, setComparisonTrips] = useState<Trip[]>([]);
  const [savedPresets, setSavedPresets] = useState<{ name: string; filters: FilterState }[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    themes: [],
    destinations: [],
    priceRange: [0, 10000],
    minRating: 0,
    groupSize: [1, 50],
    duration: "any",
    difficulty: [],
    dates: {},
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
    checkUser();
    loadSavedPresets();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSavedPresets = () => {
    const saved = localStorage.getItem('tripSearchPresets');
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .eq('trip_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const transformedTrips = (data || []).map(transformDbTrip);
      setTrips(transformedTrips);
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

  // Check if trip matches duration filter
  const matchesDuration = (trip: Trip, duration: string) => {
    if (duration === "any") return true;
    const days = trip.duration_days || 0;
    
    switch (duration) {
      case "1-3":
        return days >= 1 && days <= 3;
      case "4-7":
        return days >= 4 && days <= 7;
      case "8-14":
        return days >= 8 && days <= 14;
      case "15+":
        return days >= 15;
      default:
        return true;
    }
  };

  // Enhanced filtering logic
  const filteredAndSortedTrips = trips
    .filter(trip => {
      // Search query
      const matchesSearch = filters.searchQuery === "" || 
        trip.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        trip.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        trip.sensei_name.toLowerCase().includes(filters.searchQuery.toLowerCase());
      
      // Themes
      const matchesThemes = filters.themes.length === 0 || 
        filters.themes.some(theme => trip.theme.toLowerCase().includes(theme.toLowerCase()));
      
      // Destinations  
      const matchesDestinations = filters.destinations.length === 0 || 
        filters.destinations.some(dest => {
          const destination = trip.destination.toLowerCase();
          switch (dest) {
            case "asia":
              return destination.includes("nepal") || destination.includes("thailand") || 
                     destination.includes("japan") || destination.includes("asia");
            case "europe":
              return destination.includes("italy") || destination.includes("swiss") || 
                     destination.includes("france") || destination.includes("europe");
            case "africa":
              return destination.includes("morocco") || destination.includes("africa");
            case "americas":
              return destination.includes("peru") || destination.includes("costa rica") || 
                     destination.includes("america") || destination.includes("usa") || 
                     destination.includes("canada");
            case "oceania":
              return destination.includes("australia") || destination.includes("new zealand") ||
                     destination.includes("oceania");
            default:
              return destination.includes(dest);
          }
        });

      // Price range
      const tripPrice = extractPrice(trip.price);
      const matchesPrice = tripPrice >= filters.priceRange[0] && tripPrice <= filters.priceRange[1];
      
      // Rating
      const matchesRating = trip.rating >= filters.minRating;
      
      // Group size
      const tripGroupSize = extractGroupSize(trip.group_size);
      const matchesGroupSize = tripGroupSize >= filters.groupSize[0] && tripGroupSize <= filters.groupSize[1];

      // Duration
      const matchesDur = matchesDuration(trip, filters.duration);

      // Difficulty
      const matchesDifficulty = filters.difficulty.length === 0 || 
        filters.difficulty.some(diff => trip.difficulty_level?.toLowerCase().includes(diff.toLowerCase()));

      return matchesSearch && matchesThemes && matchesDestinations && 
             matchesPrice && matchesRating && matchesGroupSize && 
             matchesDur && matchesDifficulty;
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
        case "duration":
          return (a.duration_days || 0) - (b.duration_days || 0);
        case "newest":
        default:
          return new Date(b.dates || 0).getTime() - new Date(a.dates || 0).getTime();
      }
    });

  const removeComparisonTrip = (tripId: string) => {
    setComparisonTrips(prev => prev.filter(t => t.id !== tripId));
  };

  const selectTripFromComparison = (tripId: string) => {
    window.location.href = `/trip/${tripId}`;
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: "",
      themes: [],
      destinations: [],
      priceRange: [0, 10000],
      minRating: 0,
      groupSize: [1, 50],
      duration: "any",
      difficulty: [],
      dates: {},
    });
  };

  const activeFiltersCount = [
    filters.searchQuery,
    ...filters.themes,
    ...filters.destinations,
    ...filters.difficulty,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 10000,
    filters.minRating > 0,
    filters.groupSize[0] > 1 || filters.groupSize[1] < 50,
    filters.duration !== "any",
  ].filter(Boolean).length;


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <AdventureLoadingState 
          message="Discovering amazing adventures for you..."
          stage="Exploring"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-background text-white py-20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-80">
          <div className="absolute inset-0" style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop&opacity=20')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
        </div>
        
        <div className="container relative">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 animate-pulse" />
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                Premium Adventure Experiences
              </span>
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
              Explore Adventures
            </h1>
            <p className="font-sans text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in opacity-90">
              Discover transformative journeys led by expert Senseis around the world
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <SearchFilters 
            filters={filters}
            onFiltersChange={setFilters}
            resultsCount={filteredAndSortedTrips.length}
            className="max-w-4xl mx-auto"
          />
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16">
        <div className="container">
          {/* Results Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-3xl font-bold">
                Available Adventures
              </h2>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={clearAllFilters}
                  >
                    <span className="sr-only">Clear filters</span>
                    ×
                  </Button>
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{filteredAndSortedTrips.length} of {trips.length} trips</span>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip Results */}
          {filteredAndSortedTrips.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-3">No adventures found</h3>
                <p className="text-muted-foreground mb-6">
                  We couldn't find any trips matching your criteria. Try adjusting your filters or check back later for new adventures.
                </p>
                <Button onClick={clearAllFilters} className="gap-2">
                  <Filter className="h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          ) : (
            <TripMapView trips={filteredAndSortedTrips} />
          )}
        </div>
      </section>

      {/* Trip Comparison */}
      <TripComparison
        trips={comparisonTrips}
        onRemoveTrip={removeComparisonTrip}
        onSelectTrip={selectTripFromComparison}
      />
    </div>
  );
};

export default Explore;
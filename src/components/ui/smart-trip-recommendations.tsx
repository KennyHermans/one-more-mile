import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { FeaturedTripCard } from "./featured-trip-card";
import { TripCardSkeleton } from "./trip-card-skeleton";
import { Sparkles, Heart, TrendingUp, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  current_participants: number;
  max_participants: number;
}

interface SmartRecommendationsProps {
  userId?: string;
  limit?: number;
  className?: string;
}

export function SmartTripRecommendations({ userId, limit = 6, className }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("personalized");

  const categories = [
    { id: "personalized", label: "For You", icon: Sparkles, description: "Based on your preferences" },
    { id: "trending", label: "Trending", icon: TrendingUp, description: "Popular this month" },
    { id: "filling-fast", label: "Filling Fast", icon: Users, description: "Limited spots left" },
    { id: "last-minute", label: "Last Minute", icon: Clock, description: "Departing soon" }
  ];

  useEffect(() => {
    fetchRecommendations();
  }, [activeCategory, userId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .eq('trip_status', 'approved');

      switch (activeCategory) {
        case 'personalized':
          // For demo purposes, we'll use a simple recommendation logic
          // In production, this would use ML models based on user behavior
          if (userId) {
            // Get user's past bookings to understand preferences
            const { data: bookings } = await supabase
              .from('trip_bookings')
              .select('trip_id, trips(theme)')
              .eq('user_id', userId)
              .eq('payment_status', 'paid');
            
            if (bookings && bookings.length > 0) {
              const preferredThemes = [...new Set(bookings.map(b => b.trips?.theme).filter(Boolean))];
              if (preferredThemes.length > 0) {
                query = query.in('theme', preferredThemes);
              }
            }
          }
          query = query.order('rating', { ascending: false });
          break;
          
        case 'trending':
          query = query.order('current_participants', { ascending: false });
          break;
          
        case 'filling-fast':
          query = query
            .gt('current_participants', 6)
            .order('current_participants', { ascending: false });
          break;
          
        case 'last-minute':
          // In a real app, this would filter by start date
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(limit);
      
      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return { status: "critical", label: "Only 1-2 spots left", color: "destructive" };
    if (percentage >= 75) return { status: "low", label: "Filling fast", color: "warning" };
    if (percentage >= 50) return { status: "medium", label: "Half full", color: "secondary" };
    return { status: "high", label: "Available", color: "secondary" };
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground">
            Smart Recommendations
          </h2>
          <p className="text-muted-foreground font-sans">
            Discover trips tailored just for you
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              onClick={() => setActiveCategory(category.id)}
              className="flex items-center gap-2 font-sans"
            >
              <Icon className="h-4 w-4" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {/* Active Category Description */}
      <div className="mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {(() => {
                const category = categories.find(c => c.id === activeCategory);
                if (!category) return null;
                const Icon = category.icon;
                return (
                  <>
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-sans font-medium text-foreground">{category.label}</span>
                    <span className="text-muted-foreground font-sans">• {category.description}</span>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: limit }).map((_, index) => (
            <TripCardSkeleton key={index} />
          ))
        ) : recommendations.length > 0 ? (
          recommendations.map((trip) => {
            const availability = getAvailabilityStatus(trip.current_participants, trip.max_participants);
            
            return (
              <div key={trip.id} className="relative">
                <FeaturedTripCard
                  id={trip.id}
                  title={trip.title}
                  destination={trip.destination}
                  description={trip.description}
                  price={trip.price}
                  dates={trip.dates}
                  groupSize={trip.group_size}
                  sensei={trip.sensei_name}
                  image={trip.image_url}
                  theme={trip.theme}
                />
                
                {/* Availability Badge */}
                {activeCategory === 'filling-fast' && (
                  <div className="absolute top-4 right-4">
                    <Badge variant={availability.color as any} className="bg-white/90 backdrop-blur-sm">
                      {availability.label}
                    </Badge>
                  </div>
                )}
                
                {/* Real-time participants indicator */}
                <div className="absolute bottom-4 left-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      {trip.current_participants}/{trip.max_participants}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  No recommendations found
                </h3>
                <p className="text-muted-foreground font-sans">
                  Try exploring different categories or check back later for new trips.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { Skeleton } from "./skeleton";
import { 
  MapPin, 
  Calendar, 
  Heart, 
  Star, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Award,
  Target,
  Clock,
  Plane,
  Camera,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TravelStats {
  trips_completed: number;
  trips_pending: number;
  total_spent: number;
  trips_wishlisted: number;
  avg_rating_given: number;
  reviews_written: number;
  preferred_themes: string[];
}

interface PersonalizedDashboardProps {
  userId: string;
  className?: string;
}

export function PersonalizedDashboard({ userId, className }: PersonalizedDashboardProps) {
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch travel stats using the new function
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_customer_travel_stats', { _user_id: userId });
      
      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch upcoming trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trip_bookings')
        .select(`
          *,
          trips (
            title,
            destination,
            dates,
            image_url,
            sensei_name,
            theme
          )
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .order('booking_date', { ascending: false })
        .limit(3);

      if (tripsError) throw tripsError;
      setUpcomingTrips(tripsData || []);

      // Fetch recent activity (reviews, bookings, etc.)
      const { data: reviewsData } = await supabase
        .from('trip_reviews')
        .select(`
          *,
          trips (title, destination)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity(reviewsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressToNextMilestone = () => {
    if (!stats) return { progress: 0, nextMilestone: 5, label: "First Adventure" };
    
    const completed = stats.trips_completed;
    const milestones = [
      { count: 1, label: "First Adventure", reward: "Welcome Badge" },
      { count: 5, label: "Explorer", reward: "5% Discount" },
      { count: 10, label: "Adventurer", reward: "10% Discount" },
      { count: 20, label: "World Traveler", reward: "Priority Booking" },
      { count: 50, label: "Legend", reward: "VIP Status" }
    ];
    
    const nextMilestone = milestones.find(m => m.count > completed) || milestones[milestones.length - 1];
    const progress = completed >= nextMilestone.count ? 100 : (completed / nextMilestone.count) * 100;
    
    return { progress, nextMilestone: nextMilestone.count, label: nextMilestone.label, reward: nextMilestone.reward };
  };

  const getThemeIcon = (theme: string) => {
    switch (theme.toLowerCase()) {
      case 'adventure': return MapPin;
      case 'wellness': return Heart;
      case 'cultural': return Globe;
      case 'culinary': return Users;
      default: return Star;
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const milestone = getProgressToNextMilestone();

  return (
    <div className={className}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adventures Completed</p>
                <p className="text-3xl font-bold text-foreground">{stats?.trips_completed || 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Plane className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                <p className="text-3xl font-bold text-foreground">${stats?.total_spent || 0}</p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wishlist</p>
                <p className="text-3xl font-bold text-foreground">{stats?.trips_wishlisted || 0}</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating Given</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.avg_rating_given ? stats.avg_rating_given.toFixed(1) : 'N/A'}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Milestone */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Target className="h-5 w-5 text-primary" />
            Adventure Progress
          </CardTitle>
          <CardDescription>
            Your journey to becoming a {milestone.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {stats?.trips_completed || 0} of {milestone.nextMilestone} adventures
              </span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                {milestone.reward}
              </Badge>
            </div>
            <Progress value={milestone.progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {milestone.nextMilestone - (stats?.trips_completed || 0)} more adventures to unlock {milestone.label} status
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferred Themes */}
      {stats?.preferred_themes && stats.preferred_themes.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif">Your Adventure Preferences</CardTitle>
            <CardDescription>
              Based on your trip history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.preferred_themes.map((theme, index) => {
                const Icon = getThemeIcon(theme);
                return (
                  <Badge key={index} variant="outline" className="flex items-center gap-2 px-3 py-2">
                    <Icon className="h-4 w-4" />
                    {theme}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Adventures
            </CardTitle>
            <CardDescription>
              Your confirmed trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTrips.map((trip) => (
                <div key={trip.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <img 
                    src={trip.trips.image_url} 
                    alt={trip.trips.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{trip.trips.title}</h4>
                    <p className="text-sm text-muted-foreground">{trip.trips.destination}</p>
                    <p className="text-xs text-muted-foreground">{trip.trips.dates}</p>
                  </div>
                  <Badge variant="outline">{trip.trips.theme}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest reviews and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      You reviewed {activity.trips?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.trips?.destination} • {activity.rating}/5 stars
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
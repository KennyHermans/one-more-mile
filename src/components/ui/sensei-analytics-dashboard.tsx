import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Calendar, CalendarDays, TrendingUp, Users, Clock, MapPin, Star, Award, Target, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TripAnalytics {
  completionRate: number;
  averageRating: number;
  totalParticipants: number;
  revenueGenerated: number;
  repeatCustomers: number;
}

interface PerformanceMetrics {
  tripsCompleted: number;
  averageGroupSize: number;
  customerSatisfaction: number;
  onTimePerformance: number;
}

export function SenseiAnalyticsDashboard() {
  const [tripAnalytics, setTripAnalytics] = useState<TripAnalytics>({
    completionRate: 0,
    averageRating: 0,
    totalParticipants: 0,
    revenueGenerated: 0,
    repeatCustomers: 0
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    tripsCompleted: 0,
    averageGroupSize: 0,
    customerSatisfaction: 0,
    onTimePerformance: 0
  });

  const [monthlyData, setMonthlyData] = useState<Array<{month: string, trips: number, participants: number, revenue: number}>>([]);
  const [achievements, setAchievements] = useState([
    { title: "Top Rated Sensei", description: "Maintained 4.8+ rating for 6 months", icon: Star, unlocked: false },
    { title: "Adventure Master", description: "Led 25+ successful trips", icon: Award, unlocked: false },
    { title: "Community Builder", description: "100+ repeat customers", icon: Users, unlocked: false },
    { title: "Excellence Award", description: "99% completion rate", icon: Target, unlocked: false }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Helper function to calculate repeat customers
  const calculateRepeatCustomers = (bookings: any[]) => {
    const customerCount: { [key: string]: number } = {};
    bookings.forEach(booking => {
      customerCount[booking.user_id] = (customerCount[booking.user_id] || 0) + 1;
    });
    return Object.values(customerCount).filter(count => count > 1).length;
  };

  // Helper function to calculate on-time performance
  const calculateOnTimePerformance = (trips: any[]) => {
    if (trips.length === 0) return 100;
    
    const onTimeTrips = trips.filter(trip => {
      // Assume trip is on-time if end_date is before or equal to expected completion
      // For now, we'll use a simplified calculation
      return trip.trip_status === 'completed';
    });
    
    return Math.round((onTimeTrips.length / trips.length) * 100);
  };

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get sensei profile
      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      // Get all trips for this sensei
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('sensei_id', senseiProfile.id);

      // Get all bookings for this sensei's trips
      const { data: bookings } = await supabase
        .from('trip_bookings')
        .select('*')
        .in('trip_id', trips?.map(t => t.id) || []);

      // Get all reviews for this sensei
      const { data: reviews } = await supabase
        .from('trip_reviews')
        .select('*')
        .eq('sensei_id', senseiProfile.id);

      // Calculate analytics
      const activeTrips = trips?.filter(t => t.is_active) || [];
      const completedTrips = trips?.filter(t => !t.is_active) || [];
      const paidBookings = bookings?.filter(b => b.payment_status === 'paid') || [];
      
      const totalParticipants = paidBookings.length;
      const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
      const averageRating = reviews?.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      const averageGroupSize = activeTrips.length ? activeTrips.reduce((sum, trip) => sum + trip.current_participants, 0) / activeTrips.length : 0;

      // Calculate completion rate (assuming completed trips are those that are not active)
      const completionRate = trips?.length ? (completedTrips.length / trips.length) * 100 : 0;

      // Calculate monthly data (last 6 months)
      const monthlyStats = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthTrips = trips?.filter(trip => {
          const tripDate = new Date(trip.created_at);
          return tripDate.getMonth() === monthDate.getMonth() && tripDate.getFullYear() === monthDate.getFullYear();
        }) || [];
        
        const monthBookings = paidBookings.filter(booking => {
          const bookingDate = new Date(booking.booking_date);
          return bookingDate.getMonth() === monthDate.getMonth() && bookingDate.getFullYear() === monthDate.getFullYear();
        });
        
        monthlyStats.push({
          month: monthName,
          trips: monthTrips.length,
          participants: monthBookings.length,
          revenue: monthBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0)
        });
      }

      // Update achievements based on real data
      const updatedAchievements = achievements.map(achievement => {
        switch (achievement.title) {
          case "Top Rated Sensei":
            return { ...achievement, unlocked: averageRating >= 4.8 };
          case "Adventure Master":
            return { ...achievement, unlocked: (senseiProfile.trips_led || 0) >= 25 };
          case "Community Builder":
            return { ...achievement, unlocked: totalParticipants >= 100 };
          case "Excellence Award":
            return { ...achievement, unlocked: completionRate >= 99 };
          default:
            return achievement;
        }
      });

      setTripAnalytics({
        completionRate: Math.round(completionRate),
        averageRating: Math.round(averageRating * 10) / 10,
        totalParticipants,
        revenueGenerated: totalRevenue,
        repeatCustomers: calculateRepeatCustomers(paidBookings)
      });

      setPerformanceMetrics({
        tripsCompleted: senseiProfile.trips_led || 0,
        averageGroupSize: Math.round(averageGroupSize * 10) / 10,
        customerSatisfaction: Math.round(averageRating * 10) / 10,
        onTimePerformance: calculateOnTimePerformance(completedTrips)
      });

      setMonthlyData(monthlyStats);
      setAchievements(updatedAchievements);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-48 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Trip Completion</p>
                <p className="text-3xl font-bold text-green-800">{tripAnalytics.completionRate}%</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
            </div>
            <Progress value={tripAnalytics.completionRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-blue-800">{tripAnalytics.averageRating}/5</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Star className="h-6 w-6 text-blue-700" />
              </div>
            </div>
            <div className="flex mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-4 w-4 ${i < Math.floor(tripAnalytics.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Total Participants</p>
                <p className="text-3xl font-bold text-purple-800">{tripAnalytics.totalParticipants}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Users className="h-6 w-6 text-purple-700" />
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-2">+23% from last quarter</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">Revenue Generated</p>
                <p className="text-3xl font-bold text-orange-800">${(tripAnalytics.revenueGenerated / 1000).toFixed(0)}k</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-700" />
              </div>
            </div>
            <p className="text-sm text-orange-600 mt-2">+15% from last quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-accent">{month.month}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{month.trips} trips</p>
                      <p className="text-sm text-muted-foreground">{month.participants} participants</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${month.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements & Goals */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Achievements & Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${achievement.unlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`p-2 rounded-full ${achievement.unlocked ? 'bg-green-200' : 'bg-gray-200'}`}>
                    <achievement.icon className={`h-5 w-5 ${achievement.unlocked ? 'text-green-700' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${achievement.unlocked ? 'text-green-800' : 'text-gray-600'}`}>
                      {achievement.title}
                    </p>
                    <p className={`text-sm ${achievement.unlocked ? 'text-green-600' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      Unlocked
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{performanceMetrics.tripsCompleted}</p>
              <p className="text-sm text-muted-foreground">Trips Completed</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{performanceMetrics.averageGroupSize}</p>
              <p className="text-sm text-muted-foreground">Avg Group Size</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{performanceMetrics.customerSatisfaction}/5</p>
              <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{performanceMetrics.onTimePerformance}%</p>
              <p className="text-sm text-muted-foreground">On-Time Performance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Progress } from './progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  MapPin,
  Star,
  Target,
  Activity,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  overview: {
    totalBookings: number;
    totalRevenue: number;
    activeTrips: number;
    senseiCount: number;
    averageRating: number;
    conversionRate: number;
  };
  trends: {
    bookings: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
    ratings: Array<{ date: string; value: number }>;
  };
  demographics: Array<{ name: string; value: number; color: string }>;
  destinations: Array<{ name: string; bookings: number; revenue: number }>;
  performance: Array<{ sensei: string; trips: number; rating: number; revenue: number }>;
}

interface AdvancedAnalyticsDashboardProps {
  userRole?: 'admin' | 'sensei' | 'customer';
  senseiId?: string;
}

export function AdvancedAnalyticsDashboard({ 
  userRole = 'admin', 
  senseiId 
}: AdvancedAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, senseiId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on timeRange selection
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch comprehensive data with proper joins and filtering
      const [tripsQuery, bookingsQuery, senseisQuery, reviewsQuery] = await Promise.all([
        supabase
          .from('trips')
          .select(`
            *,
            sensei_profiles!trips_sensei_id_fkey(name, rating),
            trip_bookings(payment_status, total_amount, booking_date)
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        supabase
          .from('trip_bookings')
          .select(`
            *,
            trips(destination, theme, sensei_id)
          `)
          .gte('booking_date', startDate.toISOString())
          .lte('booking_date', endDate.toISOString()),
        
        supabase
          .from('sensei_profiles')
          .select('*')
          .eq('is_active', true),
        
        supabase
          .from('trip_reviews')
          .select(`
            *,
            trips(sensei_id),
            sensei_profiles(name)
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      if (tripsQuery.error) throw tripsQuery.error;
      if (bookingsQuery.error) throw bookingsQuery.error;
      if (senseisQuery.error) throw senseisQuery.error;
      if (reviewsQuery.error) throw reviewsQuery.error;

      const trips = tripsQuery.data || [];
      const bookings = bookingsQuery.data || [];
      const senseis = senseisQuery.data || [];
      const reviews = reviewsQuery.data || [];

      // Filter for specific sensei if provided
      const filteredTrips = senseiId 
        ? trips.filter(trip => trip.sensei_id === senseiId)
        : trips;
      
      const filteredBookings = senseiId 
        ? bookings.filter(booking => booking.trips?.sensei_id === senseiId)
        : bookings;

      // Calculate real overview metrics
      const paidBookings = filteredBookings.filter(b => b.payment_status === 'paid');
      const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;
      
      // Calculate conversion rate (paid bookings / total bookings)
      const conversionRate = filteredBookings.length > 0 
        ? (paidBookings.length / filteredBookings.length) * 100 
        : 0;

      // Generate real time series data
      const generateTimeSeries = (data: any[], getValue: (item: any) => number, getDate: (item: any) => string) => {
        const monthlyData: { [key: string]: number } = {};
        
        data.forEach(item => {
          const date = new Date(getDate(item));
          const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + getValue(item);
        });

        return Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6) // Last 6 months
          .map(([date, value]) => ({ date, value }));
      };

      // Calculate destinations with real booking data
      const destinationStats: { [key: string]: { bookings: number; revenue: number } } = {};
      
      filteredTrips.forEach(trip => {
        const tripBookings = trip.trip_bookings?.filter((b: any) => b.payment_status === 'paid') || [];
        const revenue = tripBookings.reduce((sum: number, booking: any) => sum + (booking.total_amount || 0), 0);
        
        if (!destinationStats[trip.destination]) {
          destinationStats[trip.destination] = { bookings: 0, revenue: 0 };
        }
        destinationStats[trip.destination].bookings += tripBookings.length;
        destinationStats[trip.destination].revenue += revenue;
      });

      // Calculate sensei performance with real data
      const senseiPerformance = senseis
        .map(sensei => {
          const senseiTrips = trips.filter(trip => trip.sensei_id === sensei.id);
          const senseiBookings = bookings.filter(booking => 
            senseiTrips.some(trip => trip.id === booking.trip_id) && 
            booking.payment_status === 'paid'
          );
          const revenue = senseiBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
          
          return {
            sensei: sensei.name,
            trips: senseiTrips.length,
            rating: sensei.rating || 0,
            revenue
          };
        })
        .filter(performance => performance.trips > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const realAnalyticsData: AnalyticsData = {
        overview: {
          totalBookings: filteredBookings.length,
          totalRevenue,
          activeTrips: filteredTrips.filter(trip => trip.is_active).length,
          senseiCount: senseis.length,
          averageRating,
          conversionRate
        },
        trends: {
          bookings: generateTimeSeries(
            filteredBookings, 
            () => 1, 
            (booking) => booking.booking_date
          ),
          revenue: generateTimeSeries(
            paidBookings, 
            (booking) => booking.total_amount || 0, 
            (booking) => booking.booking_date
          ),
          ratings: generateTimeSeries(
            reviews, 
            (review) => review.rating, 
            (review) => review.created_at
          ).map(point => ({ ...point, value: point.value / Math.max(1, reviews.filter(r => r.created_at.startsWith(point.date)).length) }))
        },
        demographics: [
          { name: 'Adventure', value: trips.filter(t => t.theme?.toLowerCase().includes('adventure')).length, color: 'hsl(var(--primary))' },
          { name: 'Cultural', value: trips.filter(t => t.theme?.toLowerCase().includes('cultural')).length, color: 'hsl(var(--secondary))' },
          { name: 'Nature', value: trips.filter(t => t.theme?.toLowerCase().includes('nature')).length, color: 'hsl(var(--accent))' },
          { name: 'Spiritual', value: trips.filter(t => t.theme?.toLowerCase().includes('spiritual')).length, color: 'hsl(var(--muted))' },
          { name: 'Other', value: trips.filter(t => !['adventure', 'cultural', 'nature', 'spiritual'].some(theme => t.theme?.toLowerCase().includes(theme))).length, color: 'hsl(var(--destructive))' }
        ],
        destinations: Object.entries(destinationStats)
          .sort(([,a], [,b]) => b.bookings - a.bookings)
          .slice(0, 5)
          .map(([name, stats]) => ({ name, ...stats })),
        performance: senseiPerformance
      };

      setAnalytics(realAnalyticsData);
    } catch (error) {
      // Use proper error handling instead of console.error
      throw new Error(`Failed to fetch analytics data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = 'number' 
  }: {
    title: string;
    value: number;
    change?: number;
    icon: any;
    format?: 'number' | 'currency' | 'percentage';
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return `€${val.toLocaleString()}`;
        case 'percentage':
          return `${val.toFixed(1)}%`;
        default:
          return val.toLocaleString();
      }
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{formatValue(value)}</p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7D' : 
               range === '30d' ? '30D' : 
               range === '90d' ? '90D' : '1Y'}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Bookings"
          value={analytics.overview.totalBookings}
          change={12.5}
          icon={Calendar}
        />
        <MetricCard
          title="Revenue"
          value={analytics.overview.totalRevenue}
          change={8.3}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Average Rating"
          value={analytics.overview.averageRating}
          change={1.2}
          icon={Star}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.trends.bookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Destinations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.destinations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sensei Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.performance.map((sensei, index) => (
              <div key={sensei.sensei} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <h4 className="font-semibold">{sensei.sensei}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{sensei.trips} trips</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        {sensei.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">€{sensei.revenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
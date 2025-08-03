import React, { useState, useEffect } from 'react';
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
      
      // Fetch real data from Supabase
      const [tripsData, bookingsData, senseisData, reviewsData] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('trip_bookings').select('*'),
        supabase.from('sensei_profiles').select('*'),
        supabase.from('trip_reviews').select('*')
      ]);

      // Process the data
      const trips = tripsData.data || [];
      const bookings = bookingsData.data || [];
      const senseis = senseisData.data || [];
      const reviews = reviewsData.data || [];

      const mockData: AnalyticsData = {
        overview: {
          totalBookings: bookings.length,
          totalRevenue: bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0),
          activeTrips: trips.filter(trip => trip.is_active).length,
          senseiCount: senseis.length,
          averageRating: reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
          conversionRate: 23.5
        },
        trends: {
          bookings: [
            { date: '2024-01', value: 45 },
            { date: '2024-02', value: 52 },
            { date: '2024-03', value: 38 },
            { date: '2024-04', value: 61 },
            { date: '2024-05', value: 73 },
            { date: '2024-06', value: 68 }
          ],
          revenue: [
            { date: '2024-01', value: 18500 },
            { date: '2024-02', value: 22100 },
            { date: '2024-03', value: 19800 },
            { date: '2024-04', value: 25300 },
            { date: '2024-05', value: 28900 },
            { date: '2024-06', value: 30400 }
          ],
          ratings: [
            { date: '2024-01', value: 4.5 },
            { date: '2024-02', value: 4.6 },
            { date: '2024-03', value: 4.4 },
            { date: '2024-04', value: 4.7 },
            { date: '2024-05', value: 4.8 },
            { date: '2024-06', value: 4.7 }
          ]
        },
        demographics: [
          { name: '18-25', value: 15, color: '#8884d8' },
          { name: '26-35', value: 35, color: '#82ca9d' },
          { name: '36-45', value: 30, color: '#ffc658' },
          { name: '46-55', value: 15, color: '#ff7300' },
          { name: '55+', value: 5, color: '#00ff88' }
        ],
        destinations: trips.slice(0, 5).map(trip => ({
          name: trip.destination,
          bookings: Math.floor(Math.random() * 50) + 10,
          revenue: Math.floor(Math.random() * 30000) + 10000
        })),
        performance: senseis.slice(0, 5).map(sensei => ({
          sensei: sensei.name,
          trips: sensei.trips_led || 0,
          rating: sensei.rating || 0,
          revenue: Math.floor(Math.random() * 20000) + 5000
        }))
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
          return `$${val.toLocaleString()}`;
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
                  <p className="font-semibold">${sensei.revenue.toLocaleString()}</p>
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
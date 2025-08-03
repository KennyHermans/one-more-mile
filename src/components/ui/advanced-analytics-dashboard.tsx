import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  MapPin, 
  Star,
  Calendar as CalendarIcon,
  Target,
  Zap,
  Activity,
  Award,
  Globe,
  CreditCard
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: Array<{ month: string; amount: number; bookings: number }>;
    byPaymentPlan: Array<{ plan: string; amount: number; percentage: number }>;
    growth: number;
  };
  bookings: {
    total: number;
    conversionRate: number;
    trends: Array<{ date: string; bookings: number; conversions: number }>;
    byStatus: Array<{ status: string; count: number; color: string }>;
  };
  senseis: {
    total: number;
    performance: Array<{ 
      id: string; 
      name: string; 
      rating: number; 
      tripsLed: number; 
      revenue: number;
      satisfaction: number;
    }>;
    rankings: Array<{ name: string; score: number; change: number }>;
  };
  geography: {
    destinations: Array<{ country: string; bookings: number; revenue: number }>;
    customers: Array<{ region: string; count: number; percentage: number }>;
  };
  satisfaction: {
    nps: number;
    averageRating: number;
    trends: Array<{ month: string; nps: number; rating: number }>;
    breakdown: Array<{ category: string; score: number; responses: number }>;
  };
}

interface AdvancedAnalyticsProps {
  onTimeRangeChange?: (range: { from: Date; to: Date }) => void;
}

export function AdvancedAnalyticsDashboard({ onTimeRangeChange }: AdvancedAnalyticsProps) {
  const [timeRange, setTimeRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Mock data - in real app this would come from Supabase
  const mockAnalyticsData: AnalyticsData = {
    revenue: {
      total: 247650,
      growth: 18.5,
      monthly: [
        { month: "Jan", amount: 35000, bookings: 12 },
        { month: "Feb", amount: 42000, bookings: 15 },
        { month: "Mar", amount: 38000, bookings: 14 },
        { month: "Apr", amount: 52000, bookings: 18 },
        { month: "May", amount: 48000, bookings: 16 },
        { month: "Jun", amount: 32650, bookings: 11 }
      ],
      byPaymentPlan: [
        { plan: "Full Payment", amount: 150000, percentage: 60.6 },
        { plan: "3-Month Plan", amount: 75000, percentage: 30.3 },
        { plan: "6-Month Plan", amount: 22650, percentage: 9.1 }
      ]
    },
    bookings: {
      total: 86,
      conversionRate: 68.5,
      trends: [
        { date: "Week 1", bookings: 18, conversions: 12 },
        { date: "Week 2", bookings: 22, conversions: 16 },
        { date: "Week 3", bookings: 15, conversions: 9 },
        { date: "Week 4", bookings: 31, conversions: 22 }
      ],
      byStatus: [
        { status: "Confirmed", count: 58, color: "#10b981" },
        { status: "Pending", count: 18, color: "#f59e0b" },
        { status: "Cancelled", count: 10, color: "#ef4444" }
      ]
    },
    senseis: {
      total: 24,
      performance: [
        { id: "1", name: "Akira Tanaka", rating: 4.9, tripsLed: 12, revenue: 48000, satisfaction: 96 },
        { id: "2", name: "Maria Santos", rating: 4.8, tripsLed: 10, revenue: 42000, satisfaction: 94 },
        { id: "3", name: "David Chen", rating: 4.7, tripsLed: 8, revenue: 35000, satisfaction: 91 },
        { id: "4", name: "Sofia Rodriguez", rating: 4.6, tripsLed: 7, revenue: 28000, satisfaction: 89 },
        { id: "5", name: "James Wilson", rating: 4.5, tripsLed: 6, revenue: 24000, satisfaction: 87 }
      ],
      rankings: [
        { name: "Akira Tanaka", score: 98, change: 2 },
        { name: "Maria Santos", score: 96, change: 1 },
        { name: "David Chen", score: 94, change: -1 },
        { name: "Sofia Rodriguez", score: 92, change: 3 },
        { name: "James Wilson", score: 90, change: 0 }
      ]
    },
    geography: {
      destinations: [
        { country: "Japan", bookings: 28, revenue: 125000 },
        { country: "Thailand", bookings: 22, revenue: 89000 },
        { country: "Nepal", bookings: 18, revenue: 72000 },
        { country: "Peru", bookings: 12, revenue: 48000 },
        { country: "Morocco", bookings: 6, revenue: 24000 }
      ],
      customers: [
        { region: "North America", count: 42, percentage: 48.8 },
        { region: "Europe", count: 28, percentage: 32.6 },
        { region: "Asia Pacific", count: 12, percentage: 14.0 },
        { region: "Other", count: 4, percentage: 4.6 }
      ]
    },
    satisfaction: {
      nps: 72,
      averageRating: 4.7,
      trends: [
        { month: "Jan", nps: 68, rating: 4.5 },
        { month: "Feb", nps: 70, rating: 4.6 },
        { month: "Mar", nps: 69, rating: 4.6 },
        { month: "Apr", nps: 74, rating: 4.8 },
        { month: "May", nps: 72, rating: 4.7 },
        { month: "Jun", nps: 75, rating: 4.8 }
      ],
      breakdown: [
        { category: "Trip Experience", score: 4.8, responses: 86 },
        { category: "Sensei Quality", score: 4.9, responses: 86 },
        { category: "Value for Money", score: 4.5, responses: 86 },
        { category: "Communication", score: 4.6, responses: 86 },
        { category: "Organization", score: 4.7, responses: 86 }
      ]
    }
  };

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setAnalyticsData(mockAnalyticsData);
      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

  const kpiCards = [
    {
      title: "Total Revenue",
      value: `$${(analyticsData?.revenue.total || 0).toLocaleString()}`,
      change: `+${analyticsData?.revenue.growth || 0}%`,
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Conversion Rate", 
      value: `${analyticsData?.bookings.conversionRate || 0}%`,
      change: "+5.2%",
      trend: "up",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "NPS Score",
      value: analyticsData?.satisfaction.nps || 0,
      change: "+3",
      trend: "up", 
      icon: Star,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Active Senseis",
      value: analyticsData?.senseis.total || 0,
      change: "+2",
      trend: "up",
      icon: Users,
      color: "text-amber-600", 
      bgColor: "bg-amber-50"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-8 w-16 bg-muted rounded"></div>
                  </div>
                  <div className="h-12 w-12 bg-muted rounded-lg"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your platform's performance and growth
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue Focus</SelectItem>
              <SelectItem value="bookings">Bookings Focus</SelectItem>
              <SelectItem value="satisfaction">Satisfaction Focus</SelectItem>
              <SelectItem value="performance">Performance Focus</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-64 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {timeRange.from && timeRange.to
                  ? `${format(timeRange.from, "MMM dd")} - ${format(timeRange.to, "MMM dd")}`
                  : "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={timeRange}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    const newRange = { from: range.from, to: range.to };
                    setTimeRange(newRange);
                    onTimeRangeChange?.(newRange);
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {kpi.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      kpi.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}>
                      {kpi.trend === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {kpi.change}
                    </div>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData?.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Booking Conversion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Booking Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.bookings.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#e5e7eb" name="Total Inquiries" />
                <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Plans Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Plans Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.revenue.byPaymentPlan}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ plan, percentage }) => `${plan}: ${percentage}%`}
                >
                  {analyticsData?.revenue.byPaymentPlan.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Satisfaction Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Customer Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData?.satisfaction.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="nps" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="NPS Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="rating" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Avg Rating (x20)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Senseis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performing Senseis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.senseis.performance.slice(0, 5).map((sensei, index) => (
                <div key={sensei.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? "bg-yellow-100 text-yellow-800" :
                      index === 1 ? "bg-gray-100 text-gray-800" :
                      index === 2 ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{sensei.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {sensei.rating}
                        <span>•</span>
                        {sensei.tripsLed} trips
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${sensei.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sensei.satisfaction}% satisfaction
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.geography.destinations.map((dest, index) => (
                <div key={dest.country} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">{dest.country}</p>
                      <p className="text-sm text-muted-foreground">
                        {dest.bookings} bookings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${dest.revenue.toLocaleString()}
                    </p>
                    <div className="w-24 bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(dest.bookings / Math.max(...analyticsData.geography.destinations.map(d => d.bookings))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
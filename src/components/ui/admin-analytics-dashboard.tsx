import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Activity
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  monthlyGrowth: number;
  totalBookings: number;
  averageRating: number;
  topDestinations: { name: string; count: number; }[];
  monthlyStats: { month: string; applications: number; trips: number; revenue: number; }[];
}

interface AdminAnalyticsDashboardProps {
  stats: {
    pendingApplications: number;
    totalSenseis: number;
    activeTrips: number;
    totalApplications: number;
  };
}

export function AdminAnalyticsDashboard({ stats }: AdminAnalyticsDashboardProps) {
  // Mock analytics data - in real app, this would come from props or API
  const analyticsData: AnalyticsData = {
    totalRevenue: 125000,
    monthlyGrowth: 12.5,
    totalBookings: 342,
    averageRating: 4.8,
    topDestinations: [
      { name: "Japan", count: 45 },
      { name: "Thailand", count: 38 },
      { name: "Nepal", count: 29 },
      { name: "Peru", count: 24 },
      { name: "Morocco", count: 18 }
    ],
    monthlyStats: [
      { month: "Jan", applications: 12, trips: 8, revenue: 15000 },
      { month: "Feb", applications: 18, trips: 12, revenue: 22000 },
      { month: "Mar", applications: 15, trips: 15, revenue: 28000 },
      { month: "Apr", applications: 22, trips: 18, revenue: 35000 },
      { month: "May", applications: 20, trips: 20, revenue: 42000 },
      { month: "Jun", applications: 25, trips: 22, revenue: 48000 }
    ]
  };

  const kpiCards = [
    {
      title: "Total Revenue",
      value: `$${(analyticsData.totalRevenue / 1000).toFixed(0)}K`,
      change: `+${analyticsData.monthlyGrowth}%`,
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Bookings",
      value: analyticsData.totalBookings.toString(),
      change: "+8.2%",
      trend: "up",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Average Rating",
      value: analyticsData.averageRating.toFixed(1),
      change: "+0.3",
      trend: "up",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Conversion Rate",
      value: "68%",
      change: "-2.1%",
      trend: "down",
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your platform's performance and growth metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
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

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.monthlyStats.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium w-8">{month.month}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{month.applications}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{month.trips}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-green-600">
                      ${(month.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topDestinations.map((destination, index) => (
                <div key={destination.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-yellow-100 text-yellow-800" :
                      index === 1 ? "bg-gray-100 text-gray-800" :
                      index === 2 ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{destination.name}</span>
                  </div>
                  <Badge variant="secondary">{destination.count} trips</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Applications Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Submitted</span>
                <span className="font-semibold">{stats.totalApplications}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Review</span>
                <Badge variant="secondary">{stats.pendingApplications}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Approved Rate</span>
                <span className="font-semibold text-green-600">
                  {stats.totalApplications > 0 
                    ? Math.round(((stats.totalApplications - stats.pendingApplications) / stats.totalApplications) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensei Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Senseis</span>
                <span className="font-semibold">{stats.totalSenseis}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Rating</span>
                <span className="font-semibold text-yellow-600">{analyticsData.averageRating}★</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Growth Rate</span>
                <span className="font-semibold text-green-600">+12%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Trips</span>
                <span className="font-semibold">{stats.activeTrips}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Bookings</span>
                <span className="font-semibold">{analyticsData.totalBookings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Fill Rate</span>
                <span className="font-semibold text-blue-600">75%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
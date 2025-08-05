import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  UserCheck,
  Plane,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle,
  CheckCircle,
  Eye
} from "lucide-react";

interface DashboardStats {
  pendingApplications: number;
  totalSenseis: number;
  activeTrips: number;
  totalApplications: number;
  tripProposals: number;
  cancellations: number;
}

interface QuickAction {
  title: string;
  description: string;
  action: () => void;
  icon: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

interface AdminDashboardOverviewProps {
  stats: DashboardStats;
  onTabChange: (tab: string) => void;
}

export function AdminDashboardOverview({ stats, onTabChange }: AdminDashboardOverviewProps) {
  const quickActions: QuickAction[] = [
    {
      title: "Review Applications",
      description: `${stats.pendingApplications} pending applications`,
      action: () => onTabChange("applications"),
      icon: <Eye className="h-4 w-4" />
    },
    {
      title: "View Proposals",
      description: `${stats.tripProposals} trip proposals`,
      action: () => onTabChange("proposals"),
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      title: "Handle Cancellations",
      description: `${stats.cancellations} cancellations`,
      action: () => onTabChange("cancellations"),
      icon: <AlertCircle className="h-4 w-4" />,
      variant: "outline" as const
    }
  ];

  const statCards = [
    {
      title: "Pending Applications",
      value: stats.pendingApplications,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      trend: stats.pendingApplications > 0 ? "up" : "neutral",
      action: () => onTabChange("applications")
    },
    {
      title: "Active Senseis",
      value: stats.totalSenseis,
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      trend: "neutral",
      action: () => onTabChange("senseis")
    },
    {
      title: "Active Trips",
      value: stats.activeTrips,
      icon: Plane,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "neutral",
      action: () => onTabChange("trips")
    },
    {
      title: "Total Applications",
      value: stats.totalApplications,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "neutral",
      action: () => onTabChange("applications")
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={stat.action}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.trend === "up" && (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    )}
                    {stat.trend === "down" && (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              >
                <div className="flex items-center gap-2 w-full">
                  {action.icon}
                  <span className="font-medium">{action.title}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pendingApplications > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">
                      {stats.pendingApplications} applications need review
                    </p>
                    <p className="text-sm text-amber-700">
                      New Sensei applications are waiting for approval
                    </p>
                  </div>
                  <Badge variant="secondary">{stats.pendingApplications}</Badge>
                </div>
              )}
              
              {stats.tripProposals > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      {stats.tripProposals} trip proposals submitted
                    </p>
                    <p className="text-sm text-blue-700">
                      Senseis have submitted new trip ideas
                    </p>
                  </div>
                  <Badge variant="secondary">{stats.tripProposals}</Badge>
                </div>
              )}

              {stats.cancellations > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">
                      {stats.cancellations} trip cancellations
                    </p>
                    <p className="text-sm text-red-700">
                      Some trips require replacement Senseis
                    </p>
                  </div>
                  <Badge variant="destructive">{stats.cancellations}</Badge>
                </div>
              )}

              {stats.pendingApplications === 0 && stats.tripProposals === 0 && stats.cancellations === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No urgent actions required at the moment.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-900">System Status</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-900">Active Senseis</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">{stats.totalSenseis}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium text-purple-900">Live Trips</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800">{stats.activeTrips}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
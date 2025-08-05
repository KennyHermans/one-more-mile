import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// SenseiLevelBadge component removed
import { SenseiMatchingInsights } from "@/components/ui/sensei-matching-insights";
import { EnhancedMatchingRecommendations } from "@/components/ui/enhanced-matching-recommendations";
import { 
  TrendingUp, 
  MapPin, 
  Users, 
  Calendar,
  Plus,
  Eye,
  Target,
  CheckCircle
} from "lucide-react";

interface SenseiProfile {
  id: string;
  name: string;
  bio: string;
  location: string;
  rating: number;
  trips_led: number;
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  can_create_trips: boolean;
}

interface OverviewStats {
  activeTrips: number;
  completedTrips: number;
  upcomingTrips: number;
  totalParticipants: number;
  rating: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  action: () => void;
  variant?: "default" | "outline";
}

interface SenseiOverviewDashboardProps {
  senseiProfile: SenseiProfile;
  stats: OverviewStats;
  quickActions: QuickAction[];
  onTabChange: (tab: string) => void;
}

export function SenseiOverviewDashboard({ 
  senseiProfile, 
  stats, 
  quickActions,
  onTabChange 
}: SenseiOverviewDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="border-none bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">
                Welcome back, {senseiProfile.name}!
              </CardTitle>
              <p className="text-muted-foreground">
                {senseiProfile.bio || "Ready to guide another adventure?"}
              </p>
            </div>
            <Badge variant="secondary">
              Sensei
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Trips</p>
                <p className="text-2xl font-bold">{stats.activeTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Travelers</p>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{stats.rating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                className="h-auto p-4 flex-col items-start space-y-2"
                onClick={action.action}
              >
                <div className="flex items-center gap-2 w-full">
                  <action.icon className="h-4 w-4" />
                  <span className="font-medium">{action.title}</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  {action.description}
                </p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level Progress & Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Level Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Level</span>
                <Badge variant="secondary">Sensei</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Trips Led</span>
                  <span>{senseiProfile.trips_led}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Average Rating</span>
                  <span>{stats.rating.toFixed(1)}</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingTrips > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {stats.upcomingTrips} upcoming trip{stats.upcomingTrips > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {stats.activeTrips} active trip{stats.activeTrips !== 1 ? 's' : ''}
                </span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onTabChange('trips')}
                className="w-full"
              >
                Manage All Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Trip Matching Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SenseiMatchingInsights senseiId={senseiProfile.id} />
        <EnhancedMatchingRecommendations senseiId={senseiProfile.id} />
      </div>
    </div>
  );
}
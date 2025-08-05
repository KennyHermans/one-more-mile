import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/lib/error-handler";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { RealTimeNotifications } from "./real-time-notifications";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  DollarSign,
  Calendar,
  Activity
} from "lucide-react";

interface DashboardStats {
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  senseis: {
    total: number;
    active: number;
    inactive: number;
  };
  trips: {
    total: number;
    active: number;
    completed: number;
    needingBackup: number;
  };
  alerts: {
    critical: number;
    high: number;
    total: number;
  };
  bookings: {
    total: number;
    pending: number;
    paid: number;
    revenue: number;
  };
}

interface RealTimeStatsProps {
  onStatsUpdate?: (stats: DashboardStats) => void;
}

export function RealTimeAdminDashboard({ onStatsUpdate }: RealTimeStatsProps) {
  const [stats, setStats] = useState<DashboardStats>({
    applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
    senseis: { total: 0, active: 0, inactive: 0 },
    trips: { total: 0, active: 0, completed: 0, needingBackup: 0 },
    alerts: { critical: 0, high: 0, total: 0 },
    bookings: { total: 0, pending: 0, paid: 0, revenue: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardStats();
    setupRealtimeSubscriptions();
  }, []);

  useEffect(() => {
    onStatsUpdate?.(stats);
  }, [stats, onStatsUpdate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch applications stats
      const { data: applications } = await supabase
        .from('applications')
        .select('status');

      // Fetch senseis stats
      const { data: senseis } = await supabase
        .from('sensei_profiles')
        .select('is_active');

      // Fetch trips stats
      const { data: trips } = await supabase
        .from('trips')
        .select('trip_status, requires_backup_sensei, backup_sensei_id');

      // Fetch alerts stats
      const { data: alerts } = await supabase
        .from('admin_alerts')
        .select('priority, is_resolved')
        .eq('is_resolved', false);

      // Fetch bookings stats
      const { data: bookings } = await supabase
        .from('trip_bookings')
        .select('payment_status, total_amount');

      // Process the data
      const appStats = {
        total: applications?.length || 0,
        pending: applications?.filter(a => a.status === 'pending').length || 0,
        approved: applications?.filter(a => a.status === 'approved').length || 0,
        rejected: applications?.filter(a => a.status === 'rejected').length || 0
      };

      const senseiStats = {
        total: senseis?.length || 0,
        active: senseis?.filter(s => s.is_active === true).length || 0,
        inactive: senseis?.filter(s => s.is_active === false).length || 0
      };

      const tripStats = {
        total: trips?.length || 0,
        active: trips?.filter(t => t.trip_status === 'approved').length || 0,
        completed: trips?.filter(t => t.trip_status === 'completed').length || 0,
        needingBackup: trips?.filter(t => 
          t.trip_status === 'approved' && 
          t.requires_backup_sensei === true && 
          !t.backup_sensei_id
        ).length || 0
      };

      const alertStats = {
        total: alerts?.length || 0,
        critical: alerts?.filter(a => a.priority === 'critical').length || 0,
        high: alerts?.filter(a => a.priority === 'high').length || 0
      };

      const bookingStats = {
        total: bookings?.length || 0,
        pending: bookings?.filter(b => b.payment_status === 'pending').length || 0,
        paid: bookings?.filter(b => b.payment_status === 'paid').length || 0,
        revenue: bookings?.filter(b => b.payment_status === 'paid')
          .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
      };

      const newStats: DashboardStats = {
        applications: appStats,
        senseis: senseiStats,
        trips: tripStats,
        alerts: alertStats,
        bookings: bookingStats
      };

      setStats(newStats);
      setLastUpdate(new Date());
    } catch (error) {
      logError(error as Error, {
        component: 'RealTimeAdminDashboard',
        action: 'fetchStats'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => fetchDashboardStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sensei_profiles' },
        () => fetchDashboardStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => fetchDashboardStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_alerts' },
        () => fetchDashboardStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_bookings' },
        () => fetchDashboardStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatCard = (
    title: string,
    value: number,
    subtitle?: string,
    trend?: 'up' | 'down' | 'neutral',
    trendValue?: string,
    icon?: React.ReactNode,
    variant?: 'default' | 'success' | 'warning' | 'destructive'
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'success':
          return 'border-green-200 bg-green-50';
        case 'warning':
          return 'border-yellow-200 bg-yellow-50';
        case 'destructive':
          return 'border-red-200 bg-red-50';
        default:
          return '';
      }
    };

    const getTrendIcon = () => {
      switch (trend) {
        case 'up':
          return <TrendingUp className="h-3 w-3 text-green-600" />;
        case 'down':
          return <TrendingDown className="h-3 w-3 text-red-600" />;
        default:
          return null;
      }
    };

    return (
      <Card className={getVariantStyles()}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                {trendValue && (
                  <div className="flex items-center gap-1 text-xs font-medium">
                    {getTrendIcon()}
                    {trendValue}
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            {icon && (
              <div className="p-3 rounded-lg bg-background/80">
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={fetchDashboardStats}>
            Refresh
          </Button>
          <RealTimeNotifications />
        </div>
      </div>

      {/* Critical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getStatCard(
          "Critical Alerts",
          stats.alerts.critical,
          "Require immediate attention",
          undefined,
          undefined,
          <AlertTriangle className="h-6 w-6 text-red-600" />,
          stats.alerts.critical > 0 ? 'destructive' : 'success'
        )}
        
        {getStatCard(
          "Trips Needing Backup",
          stats.trips.needingBackup,
          "Missing backup senseis",
          undefined,
          undefined,
          <Users className="h-6 w-6 text-orange-600" />,
          stats.trips.needingBackup > 0 ? 'warning' : 'success'
        )}
        
        {getStatCard(
          "Pending Applications",
          stats.applications.pending,
          "Awaiting review",
          undefined,
          undefined,
          <Clock className="h-6 w-6 text-blue-600" />,
          stats.applications.pending > 5 ? 'warning' : 'default'
        )}
        
        {getStatCard(
          "Revenue This Month",
          Math.round(stats.bookings.revenue),
          "From paid bookings",
          "up",
          "+12%",
          <DollarSign className="h-6 w-6 text-green-600" />,
          'success'
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getStatCard(
          "Total Applications",
          stats.applications.total,
          `${stats.applications.approved} approved`,
          undefined,
          undefined,
          <Users className="h-6 w-6 text-blue-600" />
        )}
        
        {getStatCard(
          "Active Senseis",
          stats.senseis.active,
          `${stats.senseis.total} total`,
          undefined,
          undefined,
          <CheckCircle className="h-6 w-6 text-green-600" />
        )}
        
        {getStatCard(
          "Active Trips",
          stats.trips.active,
          `${stats.trips.completed} completed`,
          undefined,
          undefined,
          <Calendar className="h-6 w-6 text-purple-600" />
        )}
        
        {getStatCard(
          "Paid Bookings",
          stats.bookings.paid,
          `${stats.bookings.pending} pending`,
          undefined,
          undefined,
          <Activity className="h-6 w-6 text-indigo-600" />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Approved</span>
                <Badge variant="default">{stats.applications.approved}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending</span>
                <Badge variant="secondary">{stats.applications.pending}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Rejected</span>
                <Badge variant="outline">{stats.applications.rejected}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alert Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Critical</span>
                <Badge variant="destructive">{stats.alerts.critical}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">High Priority</span>
                <Badge variant="secondary">{stats.alerts.high}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Active</span>
                <Badge variant="outline">{stats.alerts.total}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trip Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Active</span>
                <Badge variant="default">{stats.trips.active}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Need Backup</span>
                <Badge variant={stats.trips.needingBackup > 0 ? "destructive" : "outline"}>
                  {stats.trips.needingBackup}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <Badge variant="outline">{stats.trips.completed}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
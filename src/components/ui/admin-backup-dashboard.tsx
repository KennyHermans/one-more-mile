import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Clock, Users, Settings, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface BackupMetrics {
  total_requests: number;
  pending_requests: number;
  expired_requests: number;
  accepted_requests: number;
  trips_needing_backup: number;
  automation_enabled: boolean;
}

interface BackupRequest {
  id: string;
  trip_id: string;
  sensei_name: string;
  trip_title: string;
  status: string;
  match_score: number;
  requested_at: string;
  response_deadline: string;
}

interface AdminAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  trip_id?: string;
}

export const AdminBackupDashboard = () => {
  const [metrics, setMetrics] = useState<BackupMetrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<BackupRequest[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [automationEnabled, setAutomationEnabled] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Fetch backup metrics
      const { data: requestsData } = await supabase
        .from('backup_sensei_requests')
        .select(`
          id,
          trip_id,
          status,
          match_score,
          requested_at,
          response_deadline,
          sensei_profiles!inner(name),
          trips!inner(title)
        `)
        .order('requested_at', { ascending: false })
        .limit(10);

      // Fetch trips needing backup
      const { data: tripsData } = await supabase
        .from('trips')
        .select('id')
        .eq('requires_backup_sensei', true)
        .is('backup_sensei_id', null)
        .eq('is_active', true);

      // Fetch automation settings
      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('setting_value')
        .eq('setting_name', 'backup_automation_enabled')
        .single();

      // Fetch recent alerts
      const { data: alertsData } = await supabase
        .from('admin_alerts')
        .select('*')
        .in('alert_type', ['backup_assignment_failed', 'backup_needed', 'backup_timeout'])
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requestsData) {
        const metrics: BackupMetrics = {
          total_requests: requestsData.length,
          pending_requests: requestsData.filter(r => r.status === 'pending').length,
          expired_requests: requestsData.filter(r => r.status === 'expired').length,
          accepted_requests: requestsData.filter(r => r.status === 'accepted').length,
          trips_needing_backup: tripsData?.length || 0,
          automation_enabled: settingsData?.setting_value === 'true'
        };

        setMetrics(metrics);
        setAutomationEnabled(metrics.automation_enabled);

        const formattedRequests: BackupRequest[] = requestsData.map(req => ({
          id: req.id,
          trip_id: req.trip_id,
          sensei_name: req.sensei_profiles.name,
          trip_title: req.trips.title,
          status: req.status,
          match_score: req.match_score,
          requested_at: req.requested_at,
          response_deadline: req.response_deadline
        }));

        setRecentRequests(formattedRequests);
      }

      if (alertsData) {
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error fetching backup dashboard data:', error);
      toast.error('Failed to load backup dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          setting_name: 'backup_automation_enabled',
          setting_value: enabled.toString(),
          description: 'Enable automated backup sensei assignment'
        });

      if (error) throw error;

      setAutomationEnabled(enabled);
      toast.success(`Backup automation ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating automation setting:', error);
      toast.error('Failed to update automation setting');
    }
  };

  const triggerBackupCheck = async () => {
    try {
      const { error } = await supabase.functions.invoke('check-backup-requirements');
      if (error) throw error;
      
      toast.success('Backup check triggered successfully');
      setTimeout(fetchDashboardData, 2000); // Refresh data after 2 seconds
    } catch (error) {
      console.error('Error triggering backup check:', error);
      toast.error('Failed to trigger backup check');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      case 'expired': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading backup dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Backup Sensei Management</h2>
          <p className="text-muted-foreground">Monitor and manage backup sensei assignments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="automation"
              checked={automationEnabled}
              onCheckedChange={toggleAutomation}
            />
            <Label htmlFor="automation">Automation</Label>
          </div>
          <Button onClick={triggerBackupCheck} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Now
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics.pending_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics.accepted_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.expired_requests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trips Need Backup</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics.trips_needing_backup}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Backup-related system alerts requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(alert.priority)}>{alert.priority}</Badge>
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backup Requests</CardTitle>
          <CardDescription>Latest backup sensei requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No backup requests found</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{request.trip_title}</div>
                    <div className="text-sm text-muted-foreground">
                      Sensei: {request.sensei_name} • Match Score: {request.match_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(request.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                    {request.status === 'pending' && (
                      <div className="text-xs text-muted-foreground">
                        Expires: {new Date(request.response_deadline).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
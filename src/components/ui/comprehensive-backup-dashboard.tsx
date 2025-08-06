import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Bot,
  Settings,
  RefreshCw,
  Play,
  Pause
} from "lucide-react";

interface BackupMetrics {
  totalTripsRequiringBackup: number;
  activeBackupRequests: number;
  successfulAssignments: number;
  expiredRequests: number;
  averageResponseTime: string;
  automationEnabled: boolean;
}

interface BackupRequest {
  id: string;
  trip_id: string;
  sensei_id: string;
  status: string;
  match_score: number;
  requested_at: string;
  response_deadline: string;
  trips: {
    title: string;
    destination: string;
  } | null;
  sensei_profiles: {
    name: string;
  } | null;
}

interface AdminAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  priority: string;
  is_resolved: boolean;
  created_at: string;
  trip_id?: string;
}

interface AutomationSettings {
  enabled: boolean;
  max_requests_per_trip: number;
  response_timeout_hours: number;
  retry_interval_hours: number;
  escalation_enabled: boolean;
  auto_assignment_enabled: boolean;
  notification_enabled: boolean;
}

export function ComprehensiveBackupDashboard() {
  const [metrics, setMetrics] = useState<BackupMetrics>({
    totalTripsRequiringBackup: 0,
    activeBackupRequests: 0,
    successfulAssignments: 0,
    expiredRequests: 0,
    averageResponseTime: "0h",
    automationEnabled: false
  });
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: false,
    max_requests_per_trip: 3,
    response_timeout_hours: 24,
    retry_interval_hours: 6,
    escalation_enabled: true,
    auto_assignment_enabled: true,
    notification_enabled: true
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const [
        tripsData,
        requestsData,
        alertsData,
        settingsData
      ] = await Promise.all([
        supabase
          .from('trips')
          .select('id, requires_backup_sensei, backup_sensei_id')
          .eq('requires_backup_sensei', true),
        
        supabase
          .from('backup_sensei_requests')
          .select(`
            *,
            trips!inner(title, destination),
            sensei_profiles!inner(name)
          `)
          .order('requested_at', { ascending: false }),
        
        supabase
          .from('admin_alerts')
          .select('*')
          .in('alert_type', ['backup_needed', 'backup_failed', 'backup_flagged'])
          .eq('is_resolved', false)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('payment_settings')
          .select('setting_value')
          .eq('setting_name', 'backup_automation')
          .single()
      ]);

      if (tripsData.error) throw tripsData.error;
      if (requestsData.error) throw requestsData.error;
      if (alertsData.error) throw alertsData.error;

      const trips = tripsData.data || [];
      const allRequests = requestsData.data || [];
      
      // Calculate metrics
      const activeRequests = allRequests.filter(r => r.status === 'pending');
      const successfulRequests = allRequests.filter(r => r.status === 'accepted');
      const expiredRequests = allRequests.filter(r => r.status === 'expired');
      
      // Calculate average response time for successful requests
      const responseTimesInHours = successfulRequests.map(r => {
        if (!r.responded_at) return 0;
        const requestTime = new Date(r.requested_at);
        const responseTime = new Date(r.responded_at);
        return (responseTime.getTime() - requestTime.getTime()) / (1000 * 60 * 60);
      }).filter(time => time > 0);

      const avgResponseTime = responseTimesInHours.length > 0 
        ? Math.round(responseTimesInHours.reduce((a, b) => a + b, 0) / responseTimesInHours.length)
        : 0;

      setMetrics({
        totalTripsRequiringBackup: trips.length,
        activeBackupRequests: activeRequests.length,
        successfulAssignments: successfulRequests.length,
        expiredRequests: expiredRequests.length,
        averageResponseTime: `${avgResponseTime}h`,
        automationEnabled: (settingsData.data?.setting_value as any)?.enabled || false
      });

      setRequests(allRequests);
      setAlerts(alertsData.data || []);

      // Load automation settings
      if (!settingsData.error && settingsData.data?.setting_value) {
        setSettings(settingsData.data.setting_value as unknown as AutomationSettings);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load backup dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (enabled: boolean) => {
    try {
      setSaving(true);
      const newSettings = { ...settings, enabled };
      
      const { error } = await supabase
        .from('payment_settings')
        .update({ 
          setting_value: newSettings as any,
          updated_at: new Date().toISOString()
        })
        .eq('setting_name', 'backup_automation');

      if (error) throw error;

      setSettings(newSettings);
      setMetrics(prev => ({ ...prev, automationEnabled: enabled }));
      
      toast({
        title: "Success",
        description: `Backup automation ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: "Error",
        description: "Failed to update automation settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('payment_settings')
        .update({ 
          setting_value: settings as any,
          updated_at: new Date().toISOString()
        })
        .eq('setting_name', 'backup_automation');

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Automation settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save automation settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerBackupCheck = async () => {
    try {
      const { error } = await supabase.functions.invoke('check-backup-requirements');
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Backup requirements check triggered successfully",
      });
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error triggering backup check:', error);
      toast({
        title: "Error",
        description: "Failed to trigger backup check",
        variant: "destructive"
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Success",
        description: "Alert resolved successfully",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'declined': return 'outline';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Backup Management</h2>
          <p className="text-muted-foreground">Monitor and manage sensei backup assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={triggerBackupCheck} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Manual Check
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="automation-toggle">Automation</Label>
            <Switch
              id="automation-toggle"
              checked={settings.enabled}
              onCheckedChange={toggleAutomation}
              disabled={saving}
            />
            {settings.enabled ? (
              <Play className="h-4 w-4 text-green-500" />
            ) : (
              <Pause className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trips Requiring Backup</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTripsRequiringBackup}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeBackupRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Assignments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successfulAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.expiredRequests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityColor(alert.priority)}>{alert.priority}</Badge>
                      <Badge variant="outline">{alert.alert_type}</Badge>
                    </div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button onClick={() => resolveAlert(alert.id)} variant="outline" size="sm">
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Backup Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Backup Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No backup requests found</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                      <span className="text-sm font-medium">Match Score: {request.match_score}</span>
                    </div>
                    <h4 className="font-medium">{request.trips?.title || 'Unknown Trip'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Sensei: {request.sensei_profiles?.name || 'Unknown'} • 
                      Destination: {request.trips?.destination || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {new Date(request.requested_at).toLocaleString()} • 
                      Deadline: {new Date(request.response_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-requests">Max Requests per Trip</Label>
              <Input
                id="max-requests"
                type="number"
                value={settings.max_requests_per_trip}
                onChange={(e) => setSettings(prev => ({ ...prev, max_requests_per_trip: parseInt(e.target.value) }))}
                min="1"
                max="10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeout-hours">Response Timeout (hours)</Label>
              <Input
                id="timeout-hours"
                type="number"
                value={settings.response_timeout_hours}
                onChange={(e) => setSettings(prev => ({ ...prev, response_timeout_hours: parseInt(e.target.value) }))}
                min="1"
                max="168"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="retry-interval">Retry Interval (hours)</Label>
              <Input
                id="retry-interval"
                type="number"
                value={settings.retry_interval_hours}
                onChange={(e) => setSettings(prev => ({ ...prev, retry_interval_hours: parseInt(e.target.value) }))}
                min="1"
                max="72"
              />
            </div>
          </div>

          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="escalation">Enable Escalation</Label>
                <p className="text-sm text-muted-foreground">Create critical alerts when no backup is found</p>
              </div>
              <Switch
                id="escalation"
                checked={settings.escalation_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, escalation_enabled: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-assignment">Auto Assignment</Label>
                <p className="text-sm text-muted-foreground">Automatically assign backup senseis when available</p>
              </div>
              <Switch
                id="auto-assignment"
                checked={settings.auto_assignment_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_assignment_enabled: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send email notifications to backup senseis</p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notification_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notification_enabled: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
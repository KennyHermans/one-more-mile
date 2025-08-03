import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { AlertTriangle, Clock, CheckCircle, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";

interface AdminAlert {
  id: string;
  alert_type: string;
  priority: string;
  title: string;
  message: string;
  trip_id?: string;
  sensei_id?: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  trips?: {
    title: string;
    theme: string;
    dates: string;
  };
}

interface BackupRequest {
  id: string;
  trip_id: string;
  sensei_id: string;
  request_type: string;
  match_score: number;
  status: string;
  requested_at: string;
  response_deadline: string;
  responded_at?: string;
  response_reason?: string;
  trips: {
    title: string;
    theme: string;
    dates: string;
  };
  sensei_profiles: {
    name: string;
  };
}

export function AdminBackupAlerts() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [backupRequests, setBackupRequests] = useState<BackupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch admin alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('admin_alerts')
        .select(`
          *,
          trips(title, theme, dates)
        `)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch backup requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('backup_sensei_requests')
        .select(`
          *,
          trips(title, theme, dates),
          sensei_profiles(name)
        `)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      setAlerts(alertsData || []);
      setBackupRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching backup alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load backup alerts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      toast({
        title: "Success",
        description: "Alert marked as resolved",
      });

      fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  const requestBackupSenseis = async (tripId: string) => {
    try {
      const { error } = await supabase.rpc('request_backup_senseis', {
        p_trip_id: tripId,
        p_max_requests: 3
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Backup sensei requests have been sent",
      });

      fetchData();
    } catch (error) {
      console.error('Error requesting backup senseis:', error);
      toast({
        title: "Error",
        description: "Failed to send backup requests",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'missing_backup': return <Users className="h-4 w-4" />;
      case 'backup_timeout': return <Clock className="h-4 w-4" />;
      case 'backup_needed': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      case 'expired': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const unresolvedAlerts = alerts.filter(alert => !alert.is_resolved);
  const pendingRequests = backupRequests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {unresolvedAlerts.filter(a => a.priority === 'critical').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {pendingRequests.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unresolvedAlerts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Backup Alerts
          </CardTitle>
          <CardDescription>
            System alerts requiring admin attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unresolvedAlerts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No active alerts. All trips have adequate backup coverage.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {unresolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground">{alert.title}</h4>
                      <Badge variant={getPriorityColor(alert.priority)}>
                        {alert.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    
                    {alert.trips && (
                      <p className="text-xs text-muted-foreground">
                        Trip: {alert.trips.title} • {alert.trips.dates}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {alert.trip_id && alert.alert_type === 'missing_backup' && (
                      <Button
                        size="sm"
                        onClick={() => requestBackupSenseis(alert.trip_id!)}
                      >
                        Request Backup
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Requests Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Backup Requests
          </CardTitle>
          <CardDescription>
            Status of automated backup sensei requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupRequests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No backup requests have been sent yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {backupRequests.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">
                        {request.sensei_profiles.name}
                      </h4>
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Match: {request.match_score}%
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {request.trips.title} • {request.trips.dates}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      Requested: {new Date(request.requested_at).toLocaleString()}
                      {request.status === 'pending' && (
                        <span className="ml-2">
                          Deadline: {new Date(request.response_deadline).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {request.status === 'pending' && new Date(request.response_deadline) < new Date() && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
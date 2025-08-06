import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { securityAuditor, SecurityEvent } from '@/lib/security-audit';
import { useSystemHealth } from '@/hooks/use-system-health';
import { Shield, AlertTriangle, Activity, TrendingUp, RefreshCw } from 'lucide-react';

export function SecurityDashboard() {
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const { health, alerts, refreshHealth, getCriticalIssues } = useSystemHealth();

  const refreshSecurityData = async () => {
    try {
      const [stats, events, alertList] = await Promise.all([
        securityAuditor.getSecurityStats(),
        Promise.resolve(securityAuditor.getRecentEvents(20)),
        securityAuditor.checkSecurityThresholds()
      ]);
      
      setSecurityStats(stats);
      setRecentEvents(events);
      setSecurityAlerts(alertList);
    } catch (error) {
      console.error('Failed to refresh security data:', error);
    }
  };

  useEffect(() => {
    refreshSecurityData();
    const interval = setInterval(refreshSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const criticalIssues = getCriticalIssues();
  const securityScore = securityStats ? Math.max(0, 100 - (securityStats.critical_events_24h * 10) - (securityStats.high_events_24h * 5)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor system security and performance health</p>
        </div>
        <Button onClick={() => { refreshSecurityData(); refreshHealth(); }} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityScore}%</div>
            <Progress value={securityScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on recent security events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(health?.overall_status || 'unknown')}`}>
              {health?.overall_status || 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              {health?.summary.healthy_count || 0}/{health?.summary.total_checks || 0} checks healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.filter(a => a.severity === 'critical').length} critical, {alerts.filter(a => a.severity === 'warning').length} warnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats?.total_events_24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              {securityStats?.critical_events_24h || 0} critical events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues Alert */}
      {criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalIssues.length} critical issue(s) detected:</strong>
            <ul className="mt-2 list-disc list-inside">
              {criticalIssues.slice(0, 3).map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
              {criticalIssues.length > 3 && (
                <li>... and {criticalIssues.length - 3} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Threshold Alerts:</strong>
            <ul className="mt-2 list-disc list-inside">
              {securityAlerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="performance">Performance Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4">
            {health?.checks.map((check) => (
              <Card key={check.component}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{check.component}</CardTitle>
                    <Badge variant={check.status === 'healthy' ? 'default' : check.status === 'warning' ? 'secondary' : 'destructive'}>
                      {check.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{check.message}</p>
                  {check.responseTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Response time: {check.responseTime}ms
                    </p>
                  )}
                  {check.details && Object.keys(check.details).length > 0 && (
                    <div className="mt-2 text-xs">
                      <details>
                        <summary className="cursor-pointer text-muted-foreground">Details</summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(check.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4">
            {recentEvents.map((event, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{event.event_type}</CardTitle>
                    <Badge variant={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(event.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {event.user_id && (
                    <p className="text-xs text-muted-foreground mb-1">
                      User: {event.user_id}
                    </p>
                  )}
                  {event.endpoint && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Endpoint: {event.endpoint}
                    </p>
                  )}
                  {event.details && Object.keys(event.details).length > 0 && (
                    <div className="mt-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{alert.metric}</CardTitle>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(alert.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{alert.message}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>Current: {alert.current_value}</p>
                    <p>Threshold: {alert.threshold_value}</p>
                    {alert.resolved && alert.resolved_at && (
                      <p className="text-green-600">
                        Resolved: {new Date(alert.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {alerts.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No active performance alerts</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export const PlatformHealthCheck = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const runHealthChecks = async () => {
    setLoading(true);
    const checks: HealthCheck[] = [];

    try {
      // Database connectivity
      const { data: authCheck, error: authError } = await supabase.auth.getUser();
      checks.push({
        name: "Authentication Service",
        status: authError ? 'error' : 'healthy',
        message: authError ? `Error: ${authError.message}` : "Connection successful",
        timestamp: new Date()
      });

      // Database tables access
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('count')
        .limit(1);
      
      checks.push({
        name: "Database Tables",
        status: tripsError ? 'error' : 'healthy',
        message: tripsError ? `Error: ${tripsError.message}` : "All tables accessible",
        timestamp: new Date()
      });

      // Active trips count
      const { count: activeTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      checks.push({
        name: "Active Trips",
        status: activeTrips === 0 ? 'warning' : 'healthy',
        message: `${activeTrips} active trips found`,
        timestamp: new Date()
      });

      // Active senseis count
      const { count: activeSenseis } = await supabase
        .from('sensei_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      checks.push({
        name: "Active Senseis",
        status: activeSenseis === 0 ? 'warning' : 'healthy',
        message: `${activeSenseis} active senseis found`,
        timestamp: new Date()
      });

      // Edge functions health
      try {
        const { data: healthData } = await supabase.functions.invoke('health-check');
        checks.push({
          name: "Edge Functions",
          status: 'healthy',
          message: "Edge functions responding",
          timestamp: new Date()
        });
      } catch (edgeError) {
        checks.push({
          name: "Edge Functions",
          status: 'warning',
          message: "Edge functions may be unavailable",
          timestamp: new Date()
        });
      }

    } catch (error) {
      checks.push({
        name: "General System",
        status: 'error',
        message: `System error: ${error}`,
        timestamp: new Date()
      });
    }

    setHealthChecks(checks);
    setLoading(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-success/10 text-success border-success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Warning</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Error</Badge>;
    }
  };

  const overallStatus = healthChecks.some(check => check.status === 'error') 
    ? 'error' 
    : healthChecks.some(check => check.status === 'warning') 
    ? 'warning' 
    : 'healthy';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            Platform Health Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthChecks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status:</span>
          {getStatusBadge(overallStatus)}
        </div>
        
        <div className="space-y-3">
          {healthChecks.map((check, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <div className="font-medium text-sm">{check.name}</div>
                  <div className="text-xs text-muted-foreground">{check.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {check.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {getStatusBadge(check.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
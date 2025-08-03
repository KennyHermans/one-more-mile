import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Switch } from "./switch";
import { Label } from "./label";
import { Input } from "./input";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Settings, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  TrendingUp
} from "lucide-react";

interface AutomationSettings {
  enabled: boolean;
  maxRequestsPerTrip: number;
  responseTimeoutHours: number;
  minMatchScore: number;
  retryAfterHours: number;
  escalateAfterRetries: number;
}

interface AutomationStats {
  totalProcessed: number;
  successfulAssignments: number;
  failedAttempts: number;
  avgResponseTime: number;
  activeTasks: number;
}

export function AutomatedBackupAssignment() {
  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: true,
    maxRequestsPerTrip: 3,
    responseTimeoutHours: 72,
    minMatchScore: 60,
    retryAfterHours: 24,
    escalateAfterRetries: 2
  });
  
  const [stats, setStats] = useState<AutomationStats>({
    totalProcessed: 0,
    successfulAssignments: 0,
    failedAttempts: 0,
    avgResponseTime: 0,
    activeTasks: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchStats();
    setupRealtimeUpdates();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('setting_name', 'automated_backup_assignment')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.setting_value && typeof data.setting_value === 'object' && !Array.isArray(data.setting_value)) {
        setSettings(data.setting_value as unknown as AutomationSettings);
      }
    } catch (error) {
      console.error('Error fetching automation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch backup request statistics
      const { data: requests, error } = await supabase
        .from('backup_sensei_requests')
        .select('status, requested_at, responded_at, response_deadline');

      if (error) throw error;

      const total = requests?.length || 0;
      const successful = requests?.filter(r => r.status === 'accepted').length || 0;
      const failed = requests?.filter(r => r.status === 'expired' || r.status === 'declined').length || 0;
      const active = requests?.filter(r => r.status === 'pending').length || 0;

      // Calculate average response time for accepted requests
      const acceptedWithTimes = requests?.filter(r => 
        r.status === 'accepted' && r.requested_at && r.responded_at
      ) || [];

      const avgTime = acceptedWithTimes.length > 0 
        ? acceptedWithTimes.reduce((sum, r) => {
            const requestTime = new Date(r.requested_at).getTime();
            const responseTime = new Date(r.responded_at!).getTime();
            return sum + (responseTime - requestTime) / (1000 * 60 * 60); // hours
          }, 0) / acceptedWithTimes.length
        : 0;

      setStats({
        totalProcessed: total,
        successfulAssignments: successful,
        failedAttempts: failed,
        avgResponseTime: avgTime,
        activeTasks: active
      });
    } catch (error) {
      console.error('Error fetching automation stats:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    const channel = supabase
      .channel('backup-automation-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'backup_sensei_requests' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          setting_name: 'automated_backup_assignment',
          setting_value: settings as any,
          description: 'Configuration for automated backup sensei assignment system'
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Automation settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save automation settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerManualScan = async () => {
    try {
      // Find trips that need backup senseis
      const { data: trips, error } = await supabase
        .from('trips')
        .select('id, title')
        .eq('trip_status', 'approved')
        .eq('requires_backup_sensei', true)
        .is('backup_sensei_id', null);

      if (error) throw error;

      let processedCount = 0;
      
      for (const trip of trips || []) {
        try {
          const { error: rpcError } = await supabase.rpc('request_backup_senseis', {
            p_trip_id: trip.id,
            p_max_requests: settings.maxRequestsPerTrip
          });

          if (!rpcError) {
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing trip ${trip.id}:`, error);
        }
      }

      toast({
        title: "Manual Scan Complete",
        description: `Processed ${processedCount} trips requiring backup senseis.`,
      });

      fetchStats();
    } catch (error) {
      console.error('Error during manual scan:', error);
      toast({
        title: "Error",
        description: "Failed to complete manual scan.",
        variant: "destructive",
      });
    }
  };

  const getSuccessRate = () => {
    if (stats.totalProcessed === 0) return 0;
    return Math.round((stats.successfulAssignments / stats.totalProcessed) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Automated Backup Assignment
          </h2>
          <p className="text-muted-foreground">
            Intelligent system for automatically assigning backup senseis to trips
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={triggerManualScan}
            disabled={!settings.enabled}
          >
            <Play className="h-4 w-4 mr-2" />
            Manual Scan
          </Button>
          <div className="flex items-center space-x-2">
            <Switch
              id="automation-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
            />
            <Label htmlFor="automation-enabled">
              {settings.enabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold text-green-600">{getSuccessRate()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-xl font-bold">{stats.successfulAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-xl font-bold">{Math.round(stats.avgResponseTime)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                <p className="text-xl font-bold">{stats.activeTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-xl font-bold">{stats.failedAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-requests">Max Requests per Trip</Label>
              <Input
                id="max-requests"
                type="number"
                min="1"
                max="10"
                value={settings.maxRequestsPerTrip}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  maxRequestsPerTrip: parseInt(e.target.value) || 3 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout-hours">Response Timeout (hours)</Label>
              <Input
                id="timeout-hours"
                type="number"
                min="24"
                max="168"
                value={settings.responseTimeoutHours}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  responseTimeoutHours: parseInt(e.target.value) || 72 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-match">Minimum Match Score (%)</Label>
              <Input
                id="min-match"
                type="number"
                min="0"
                max="100"
                value={settings.minMatchScore}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  minMatchScore: parseInt(e.target.value) || 60 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry-hours">Retry After (hours)</Label>
              <Input
                id="retry-hours"
                type="number"
                min="1"
                max="72"
                value={settings.retryAfterHours}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  retryAfterHours: parseInt(e.target.value) || 24 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escalate-retries">Escalate After Retries</Label>
              <Input
                id="escalate-retries"
                type="number"
                min="1"
                max="5"
                value={settings.escalateAfterRetries}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  escalateAfterRetries: parseInt(e.target.value) || 2 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicator */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                settings.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <div>
                <p className="font-medium">
                  Automation Status: {settings.enabled ? 'Active' : 'Disabled'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {settings.enabled 
                    ? 'System is actively monitoring and assigning backup senseis'
                    : 'Automation is currently disabled'
                  }
                </p>
              </div>
            </div>
            
            {stats.activeTasks > 0 && (
              <Badge variant="secondary">
                {stats.activeTasks} active tasks
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
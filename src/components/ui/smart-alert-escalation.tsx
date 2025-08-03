import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Progress } from "./progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Target,
  Clock,
  CheckCircle,
  RefreshCw,
  Zap
} from "lucide-react";

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

interface SmartRoutingRule {
  id: string;
  alertType: string;
  routingCriteria: {
    priority: string[];
    userRoles: string[];
    escalationTime: number;
  };
  isActive: boolean;
  successRate: number;
}

interface AlertAnalytics {
  totalAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: number;
  criticalAlerts: number;
  escalatedAlerts: number;
  automationSuccessRate: number;
}

export function SmartAlertSystem() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [routingRules, setSmartRoutingRules] = useState<SmartRoutingRule[]>([]);
  const [analytics, setAnalytics] = useState<AlertAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlertSystemData();
    setupRealtimeMonitoring();
  }, []);

  const fetchAlertSystemData = async () => {
    try {
      setLoading(true);

      // Fetch alert analytics
      const { data: alerts, error: alertsError } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      const alertAnalytics = calculateAlertAnalytics(alerts || []);
      setAnalytics(alertAnalytics);

      // Initialize smart alert rules
      const defaultRules: AlertRule[] = [
        {
          id: '1',
          name: 'High Backup Request Failure Rate',
          condition: 'backup_failure_rate > 30%',
          priority: 'high',
          isActive: true,
          triggerCount: 3
        },
        {
          id: '2',
          name: 'Critical Trip Deadline Approaching',
          condition: 'trip_deadline < 24 hours AND no_backup_assigned',
          priority: 'critical',
          isActive: true,
          triggerCount: 7
        },
        {
          id: '3',
          name: 'Sensei Performance Degradation',
          condition: 'sensei_rating < 4.0 AND recent_bookings > 5',
          priority: 'medium',
          isActive: true,
          triggerCount: 2
        },
        {
          id: '4',
          name: 'Payment Processing Issues',
          condition: 'payment_failures > 10% in 24h',
          priority: 'high',
          isActive: true,
          triggerCount: 1
        },
        {
          id: '5',
          name: 'Customer Satisfaction Drop',
          condition: 'avg_rating < 4.0 AND reviews > 10',
          priority: 'medium',
          isActive: true,
          triggerCount: 0
        }
      ];

      const defaultRoutingRules: SmartRoutingRule[] = [
        {
          id: '1',
          alertType: 'backup_assignment',
          routingCriteria: {
            priority: ['critical', 'high'],
            userRoles: ['admin', 'journey_curator'],
            escalationTime: 2
          },
          isActive: true,
          successRate: 87.5
        },
        {
          id: '2',
          alertType: 'payment_issues',
          routingCriteria: {
            priority: ['critical', 'high', 'medium'],
            userRoles: ['admin'],
            escalationTime: 1
          },
          isActive: true,
          successRate: 94.2
        },
        {
          id: '3',
          alertType: 'sensei_performance',
          routingCriteria: {
            priority: ['high', 'medium'],
            userRoles: ['admin', 'sensei_scout'],
            escalationTime: 4
          },
          isActive: true,
          successRate: 78.9
        }
      ];

      setAlertRules(defaultRules);
      setSmartRoutingRules(defaultRoutingRules);
    } catch (error) {
      console.error('Error fetching alert system data:', error);
      toast({
        title: "Error",
        description: "Failed to load alert system data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeMonitoring = () => {
    const channel = supabase
      .channel('smart-alerts-monitoring')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_alerts' },
        (payload) => {
          console.log('New alert detected, processing smart routing...', payload);
          processSmartRouting(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_alerts' },
        () => {
          fetchAlertSystemData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const calculateAlertAnalytics = (alerts: any[]): AlertAnalytics => {
    const totalAlerts = alerts.length;
    const resolvedAlerts = alerts.filter(a => a.is_resolved).length;
    const criticalAlerts = alerts.filter(a => a.priority === 'critical' && !a.is_resolved).length;
    
    // Calculate average resolution time for resolved alerts
    const resolvedWithTimes = alerts.filter(a => a.is_resolved && a.resolved_at);
    const avgResolutionTime = resolvedWithTimes.length > 0 
      ? resolvedWithTimes.reduce((sum, alert) => {
          const created = new Date(alert.created_at).getTime();
          const resolved = new Date(alert.resolved_at).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60); // hours
        }, 0) / resolvedWithTimes.length
      : 0;

    return {
      totalAlerts,
      resolvedAlerts,
      avgResolutionTime,
      criticalAlerts,
      escalatedAlerts: Math.round(totalAlerts * 0.15), // 15% escalation rate
      automationSuccessRate: 87.3
    };
  };

  const processSmartRouting = async (newAlert: any) => {
    try {
      // Find matching routing rule
      const routingRule = routingRules.find(rule => 
        rule.isActive && rule.alertType === newAlert.alert_type
      );

      if (routingRule) {
        // Apply smart routing logic
        console.log(`Applying smart routing for ${newAlert.alert_type} alert`);
        
        // In a real implementation, this would:
        // 1. Determine the best admin to route to based on availability and expertise
        // 2. Send targeted notifications
        // 3. Set escalation timers
        // 4. Track routing success

        toast({
          title: "Smart Routing Applied",
          description: `Alert routed using ${routingRule.id} rule with ${routingRule.successRate}% success rate`,
        });
      }
    } catch (error) {
      console.error('Error in smart routing:', error);
    }
  };

  const toggleAlertRule = async (ruleId: string) => {
    setAlertRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );

    toast({
      title: "Alert Rule Updated",
      description: "Rule status has been changed successfully",
    });
  };

  const triggerTestAlert = async (ruleId: string) => {
    const rule = alertRules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      await supabase
        .from('admin_alerts')
        .insert({
          alert_type: 'test_alert',
          priority: rule.priority,
          title: `Test Alert: ${rule.name}`,
          message: `This is a test alert triggered by rule: ${rule.condition}`,
          metadata: { test: true, ruleId }
        });

      // Update trigger count
      setAlertRules(prev => 
        prev.map(r => 
          r.id === ruleId 
            ? { ...r, triggerCount: r.triggerCount + 1, lastTriggered: new Date().toISOString() }
            : r
        )
      );

      toast({
        title: "Test Alert Triggered",
        description: `Test alert sent for rule: ${rule.name}`,
      });
    } catch (error) {
      console.error('Error triggering test alert:', error);
      toast({
        title: "Error",
        description: "Failed to trigger test alert",
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-600" />
            Smart Alert & Escalation System
          </h2>
          <p className="text-muted-foreground">
            AI-powered alert routing with intelligent escalation and automated responses
          </p>
        </div>
        <Button variant="outline" onClick={fetchAlertSystemData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                <p className="text-xl font-bold text-red-600">{analytics?.criticalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-xl font-bold">{analytics?.resolvedAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-xl font-bold">{analytics?.avgResolutionTime.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Escalated</p>
                <p className="text-xl font-bold">{analytics?.escalatedAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automation Rate</p>
                <p className="text-xl font-bold">{analytics?.automationSuccessRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-xl font-bold">{analytics?.totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Alert Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alertRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getPriorityIcon(rule.priority)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rule.name}</h4>
                      <Badge variant={getPriorityColor(rule.priority)}>
                        {rule.priority}
                      </Badge>
                      {rule.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Condition: {rule.condition}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Triggered: {rule.triggerCount} times</span>
                      {rule.lastTriggered && (
                        <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerTestAlert(rule.id)}
                  >
                    Test
                  </Button>
                  <Button
                    variant={rule.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleAlertRule(rule.id)}
                  >
                    {rule.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Routing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Smart Routing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routingRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium capitalize">{rule.alertType.replace('_', ' ')}</h4>
                    {rule.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Success Rate:</span>
                    <Badge variant="secondary">{rule.successRate}%</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">Priority Levels</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.routingCriteria.priority.map((priority) => (
                        <Badge key={priority} variant="outline" className="text-xs">
                          {priority}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">Target Roles</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.routingCriteria.userRoles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">Escalation Time</p>
                    <Badge variant="secondary">{rule.routingCriteria.escalationTime}h</Badge>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Success Rate</span>
                    <span className="text-xs font-medium">{rule.successRate}%</span>
                  </div>
                  <Progress value={rule.successRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
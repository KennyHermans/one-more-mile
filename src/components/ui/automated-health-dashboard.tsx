import { useState, useEffect } from "react";
import { healthMonitor, SystemHealth, HealthStatus, HealthIssue } from "@/services/health-monitor";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Progress } from "./progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Lock, 
  Server, 
  Shield, 
  Wifi, 
  XCircle,
  ChevronDown,
  RefreshCw,
  Zap,
  TrendingUp,
  Eye,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomatedHealthDashboardProps {
  autoStart?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function AutomatedHealthDashboard({ 
  autoStart = true, 
  refreshInterval = 60000,
  className 
}: AutomatedHealthDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = healthMonitor.subscribe(handleHealthUpdate);
    
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      unsubscribe();
      healthMonitor.stop();
    };
  }, [autoStart, refreshInterval]);

  const handleHealthUpdate = (health: SystemHealth) => {
    setSystemHealth(health);
    setLastRefresh(new Date());
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    healthMonitor.start(refreshInterval);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    healthMonitor.stop();
  };

  const performManualCheck = async () => {
    const health = await healthMonitor.performHealthCheck();
    setSystemHealth(health);
    setLastRefresh(new Date());
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default' as const;
      case 'warning':
        return 'secondary' as const;
      case 'critical':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'realtime':
        return <Wifi className="h-4 w-4" />;
      case 'authentication':
        return <Lock className="h-4 w-4" />;
      case 'edge_functions':
        return <Server className="h-4 w-4" />;
      case 'storage':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive' as const;
      case 'high':
        return 'destructive' as const;
      case 'medium':
        return 'secondary' as const;
      case 'low':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const getHealthPercentage = () => {
    if (!systemHealth) return 0;
    
    const totalComponents = systemHealth.components.length;
    const healthyComponents = systemHealth.components.filter(c => c.status === 'healthy').length;
    
    return totalComponents > 0 ? Math.round((healthyComponents / totalComponents) * 100) : 0;
  };

  const getUptime = () => {
    if (!systemHealth) return "Unknown";
    
    const criticalIssues = systemHealth.issues.filter(i => i.severity === 'critical');
    return criticalIssues.length === 0 ? "100%" : "Degraded";
  };

  if (!systemHealth) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <Button onClick={performManualCheck} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Initialize
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Health monitoring not started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(systemHealth.overall)}>
                {getStatusIcon(systemHealth.overall)}
                {systemHealth.overall.toUpperCase()}
              </Badge>
              <Button 
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
              >
                {isMonitoring ? "Stop" : "Start"} Monitoring
              </Button>
              <Button onClick={performManualCheck} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{getHealthPercentage()}%</div>
              <div className="text-sm text-muted-foreground">Overall Health</div>
              <Progress value={getHealthPercentage()} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemHealth.components.length}</div>
              <div className="text-sm text-muted-foreground">Components</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemHealth.issues.length}</div>
              <div className="text-sm text-muted-foreground">Active Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{getUptime()}</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {lastRefresh.toLocaleString()} | 
            Auto-refresh: {isMonitoring ? `${refreshInterval / 1000}s` : 'Disabled'}
          </div>
        </CardContent>
      </Card>

      {/* Component Status */}
      <Card>
        <Collapsible 
          open={expandedSections.has('components')}
          onOpenChange={() => toggleSection('components')}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Component Status ({systemHealth.components.length})
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", 
                  expandedSections.has('components') && "rotate-180")} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                {systemHealth.components.map((component, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getComponentIcon(component.component)}
                      <div>
                        <div className="font-medium capitalize">
                          {component.component.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {component.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {component.responseTime && (
                        <span className="text-xs text-muted-foreground">
                          {component.responseTime}ms
                        </span>
                      )}
                      <Badge variant={getStatusColor(component.status)}>
                        {getStatusIcon(component.status)}
                        {component.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Active Issues */}
      {systemHealth.issues.length > 0 && (
        <Card>
          <Collapsible 
            open={expandedSections.has('issues')}
            onOpenChange={() => toggleSection('issues')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Active Issues ({systemHealth.issues.length})
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", 
                    expandedSections.has('issues') && "rotate-180")} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-3">
                  {systemHealth.issues.map((issue, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {issue.component}
                            </span>
                            {issue.auto_fixable && (
                              <Badge variant="outline">
                                <Zap className="h-3 w-3 mr-1" />
                                Auto-fixable
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{issue.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Detected: {issue.detected_at.toLocaleString()}</span>
                        {issue.fix_attempted && (
                          <span className="text-warning">Auto-fix attempted</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <Collapsible 
          open={expandedSections.has('performance')}
          onOpenChange={() => toggleSection('performance')}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", 
                  expandedSections.has('performance') && "rotate-180")} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {systemHealth.components
                      .filter(c => c.responseTime)
                      .reduce((avg, c) => avg + (c.responseTime || 0), 0) / 
                     systemHealth.components.filter(c => c.responseTime).length || 0}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {systemHealth.issues.filter(i => i.type === 'performance').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Performance Issues</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {systemHealth.issues.filter(i => i.auto_fixable).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Auto-fixable Issues</div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
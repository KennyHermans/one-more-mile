import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Server, 
  Shield, 
  TrendingUp,
  Zap,
  RefreshCw
} from "lucide-react";
import { productionDeployment, type DeploymentHealth, type LoadTestResult } from "@/lib/production-deployment";
import { productionConfig } from "@/lib/production-config";

interface ProductionMonitoringDashboardProps {
  className?: string;
}

export function ProductionMonitoringDashboard({ className }: ProductionMonitoringDashboardProps) {
  const [deploymentHealth, setDeploymentHealth] = useState<DeploymentHealth | null>(null);
  const [loadTestResults, setLoadTestResults] = useState<LoadTestResult[]>([]);
  const [isLoadTesting, setIsLoadTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      const health = await productionDeployment.getDeploymentHealth();
      setDeploymentHealth(health);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runLoadTest = async (concurrentUsers: number, duration: number) => {
    setIsLoadTesting(true);
    try {
      const result = await productionDeployment.runLoadTest({
        concurrentUsers,
        duration
      });
      setLoadTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    } catch (error) {
      console.error('Load test failed:', error);
    } finally {
      setIsLoadTesting(false);
    }
  };

  const generateReport = async () => {
    try {
      const report = await productionDeployment.generatePerformanceReport();
      console.log('Performance report generated:', report);
      // In a real implementation, you might download this as a PDF or send it via email
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const config = productionConfig.getConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading production monitoring data...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Production Monitoring</h2>
          <p className="text-muted-foreground">
            Environment: {config.environment} • Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadHealthData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={generateReport} variant="outline" size="sm">
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="load-testing">Load Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {deploymentHealth && (
            <>
              {/* Overall Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(deploymentHealth.status)}
                    <span className={getStatusColor(deploymentHealth.status)}>
                      System Status: {deploymentHealth.status.toUpperCase()}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Overall health of the production deployment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatUptime(deploymentHealth.metrics.uptime)}</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{deploymentHealth.metrics.responseTime.toFixed(0)}ms</div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{deploymentHealth.metrics.errorRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Error Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{deploymentHealth.metrics.throughput.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">RPS</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Alerts */}
              {deploymentHealth.alerts > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {deploymentHealth.alerts} active alert{deploymentHealth.alerts !== 1 ? 's' : ''} requiring attention
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(deploymentHealth.checks).map(([component, isHealthy]) => (
                  <Card key={component}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-2">
                        {component === 'database' && <Database className="h-4 w-4" />}
                        {component === 'cache' && <Zap className="h-4 w-4" />}
                        {component === 'monitoring' && <Activity className="h-4 w-4" />}
                        {component === 'security' && <Shield className="h-4 w-4" />}
                        {component === 'performance' && <TrendingUp className="h-4 w-4" />}
                        <span className="text-sm font-medium capitalize">{component}</span>
                      </div>
                      <Badge variant={isHealthy ? "default" : "destructive"}>
                        {isHealthy ? "OK" : "FAIL"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Health Checks</CardTitle>
              <CardDescription>
                Comprehensive system component health status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deploymentHealth && Object.entries(deploymentHealth.checks).map(([component, isHealthy]) => (
                  <div key={component} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {component === 'database' && <Database className="h-5 w-5" />}
                      {component === 'cache' && <Zap className="h-5 w-5" />}
                      {component === 'monitoring' && <Activity className="h-5 w-5" />}
                      {component === 'security' && <Shield className="h-5 w-5" />}
                      {component === 'performance' && <TrendingUp className="h-5 w-5" />}
                      <div>
                        <div className="font-medium capitalize">{component} Service</div>
                        <div className="text-sm text-muted-foreground">
                          {isHealthy ? 'Operating normally' : 'Service degraded or unavailable'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isHealthy ? "default" : "destructive"}>
                        {isHealthy ? "Healthy" : "Unhealthy"}
                      </Badge>
                      {getStatusIcon(isHealthy ? 'healthy' : 'unhealthy')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Current system performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deploymentHealth && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Response Time</span>
                        <span>{deploymentHealth.metrics.responseTime.toFixed(0)}ms</span>
                      </div>
                      <Progress 
                        value={Math.min((deploymentHealth.metrics.responseTime / 2000) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Error Rate</span>
                        <span>{deploymentHealth.metrics.errorRate.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(deploymentHealth.metrics.errorRate * 10, 100)} 
                        className={`h-2 ${deploymentHealth.metrics.errorRate > 5 ? 'bg-red-200' : ''}`}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Throughput</span>
                        <span>{deploymentHealth.metrics.throughput.toFixed(0)} RPS</span>
                      </div>
                      <Progress 
                        value={Math.min((deploymentHealth.metrics.throughput / 200) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Configuration</CardTitle>
                <CardDescription>Current production settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <Badge variant="outline">{config.environment}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Monitoring:</span>
                    <Badge variant={config.monitoring.enabled ? "default" : "secondary"}>
                      {config.monitoring.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache TTL:</span>
                    <span>{Math.round(config.caching.defaultTTL / 60000)}min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate Limit:</span>
                    <span>{config.rateLimiting.maxRequests} req/window</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Audit:</span>
                    <Badge variant={config.security.auditingEnabled ? "default" : "secondary"}>
                      {config.security.auditingEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="load-testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Load Testing</CardTitle>
              <CardDescription>
                Simulate traffic to test system performance under load
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button 
                  onClick={() => runLoadTest(10, 30)} 
                  disabled={isLoadTesting}
                  size="sm"
                >
                  Light Load (10 users, 30s)
                </Button>
                <Button 
                  onClick={() => runLoadTest(50, 60)} 
                  disabled={isLoadTesting}
                  size="sm"
                >
                  Medium Load (50 users, 60s)
                </Button>
                <Button 
                  onClick={() => runLoadTest(100, 60)} 
                  disabled={isLoadTesting}
                  size="sm"
                >
                  Heavy Load (100 users, 60s)
                </Button>
              </div>

              {isLoadTesting && (
                <Alert>
                  <Activity className="h-4 w-4 animate-pulse" />
                  <AlertDescription>
                    Load test in progress... This may take a few minutes.
                  </AlertDescription>
                </Alert>
              )}

              {loadTestResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Recent Load Test Results</h4>
                  {loadTestResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">{result.concurrent_users} users</div>
                            <div className="text-muted-foreground">{result.duration_seconds}s duration</div>
                          </div>
                          <div>
                            <div className="font-medium">{result.average_response_time.toFixed(0)}ms avg</div>
                            <div className="text-muted-foreground">Response time</div>
                          </div>
                          <div>
                            <div className="font-medium">{result.throughput_rps.toFixed(1)} RPS</div>
                            <div className="text-muted-foreground">Throughput</div>
                          </div>
                          <div>
                            <div className={`font-medium ${result.error_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {result.error_rate.toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground">Error rate</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
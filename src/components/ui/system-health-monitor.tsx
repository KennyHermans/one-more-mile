import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import { Button } from './button';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { performanceMonitor } from '@/lib/performance-monitor';
import { cacheManager } from '@/lib/cache-manager';
import { queryClient } from '@/lib/query-client';

interface SystemMetrics {
  performance: {
    averageResponseTime: number;
    webVitalsScore: number;
    slowOperations: number;
    totalMetrics: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  queries: {
    activeQueries: number;
    failedQueries: number;
    cachedQueries: number;
  };
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
}

interface HealthStatus {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  performance: 'excellent' | 'good' | 'warning' | 'critical';
  cache: 'excellent' | 'good' | 'warning' | 'critical';
  database: 'excellent' | 'good' | 'warning' | 'critical';
}

export function SystemHealthMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Collect system metrics
  const collectMetrics = async (): Promise<SystemMetrics> => {
    const perfSummary = performanceMonitor.getPerformanceSummary();
    const cacheStats = cacheManager.getStats();
    const queryCache = queryClient.getQueryCache();
    
    // Get memory info (if available)
    const memoryInfo = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };

    return {
      performance: {
        averageResponseTime: perfSummary.summary.averageResponseTime,
        webVitalsScore: perfSummary.summary.webVitalsScore,
        slowOperations: perfSummary.summary.slowOperations,
        totalMetrics: perfSummary.summary.totalMetrics,
      },
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        hitRate: cacheStats.hitRate,
      },
      queries: {
        activeQueries: queryCache.getAll().filter(q => q.state.status === 'pending').length,
        failedQueries: queryCache.getAll().filter(q => q.state.status === 'error').length,
        cachedQueries: queryCache.getAll().length,
      },
      memory: {
        used: memoryInfo.usedJSHeapSize,
        available: memoryInfo.jsHeapSizeLimit,
        percentage: memoryInfo.jsHeapSizeLimit > 0 
          ? (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100 
          : 0,
      },
    };
  };

  // Calculate health status
  const calculateHealth = (metrics: SystemMetrics): HealthStatus => {
    const getPerformanceHealth = (): HealthStatus['performance'] => {
      if (metrics.performance.webVitalsScore >= 90) return 'excellent';
      if (metrics.performance.webVitalsScore >= 75) return 'good';
      if (metrics.performance.webVitalsScore >= 50) return 'warning';
      return 'critical';
    };

    const getCacheHealth = (): HealthStatus['cache'] => {
      const utilization = (metrics.cache.size / metrics.cache.maxSize) * 100;
      if (utilization < 70 && metrics.cache.hitRate > 0.8) return 'excellent';
      if (utilization < 85 && metrics.cache.hitRate > 0.6) return 'good';
      if (utilization < 95) return 'warning';
      return 'critical';
    };

    const getDatabaseHealth = (): HealthStatus['database'] => {
      const errorRate = metrics.queries.cachedQueries > 0 
        ? metrics.queries.failedQueries / metrics.queries.cachedQueries 
        : 0;
      
      if (errorRate < 0.01) return 'excellent';
      if (errorRate < 0.05) return 'good';
      if (errorRate < 0.1) return 'warning';
      return 'critical';
    };

    const performance = getPerformanceHealth();
    const cache = getCacheHealth();
    const database = getDatabaseHealth();

    // Calculate overall health
    const scores = { excellent: 4, good: 3, warning: 2, critical: 1 };
    const avgScore = (scores[performance] + scores[cache] + scores[database]) / 3;
    
    let overall: HealthStatus['overall'];
    if (avgScore >= 3.5) overall = 'excellent';
    else if (avgScore >= 2.5) overall = 'good';
    else if (avgScore >= 1.5) overall = 'warning';
    else overall = 'critical';

    return { overall, performance, cache, database };
  };

  // Refresh metrics
  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const newMetrics = await collectMetrics();
      const newHealth = calculateHealth(newMetrics);
      
      setMetrics(newMetrics);
      setHealth(newHealth);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh metrics
  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'excellent':
        return { color: 'bg-green-500', icon: CheckCircle, text: 'Excellent', variant: 'default' as const };
      case 'good':
        return { color: 'bg-blue-500', icon: CheckCircle, text: 'Good', variant: 'secondary' as const };
      case 'warning':
        return { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Warning', variant: 'outline' as const };
      case 'critical':
        return { color: 'bg-red-500', icon: AlertTriangle, text: 'Critical', variant: 'destructive' as const };
      default:
        return { color: 'bg-gray-500', icon: Minus, text: 'Unknown', variant: 'outline' as const };
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!metrics || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
          </CardTitle>
          <CardDescription>Loading system metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getStatusDisplay(health.overall);

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>System Health Monitor</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={overallStatus.variant} className="flex items-center gap-1">
                <overallStatus.icon className="h-3 w-3" />
                {overallStatus.text}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshMetrics}
                disabled={isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
              <Badge variant={getStatusDisplay(health.performance).variant}>
                {getStatusDisplay(health.performance).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Web Vitals Score</span>
                <span>{metrics.performance.webVitalsScore.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.performance.webVitalsScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Avg Response</span>
                <p className="font-medium">{metrics.performance.averageResponseTime.toFixed(0)}ms</p>
              </div>
              <div>
                <span className="text-muted-foreground">Slow Ops</span>
                <p className="font-medium">{metrics.performance.slowOperations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache
              <Badge variant={getStatusDisplay(health.cache).variant}>
                {getStatusDisplay(health.cache).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Cache Utilization</span>
                <span>{metrics.cache.size}/{metrics.cache.maxSize}</span>
              </div>
              <Progress 
                value={(metrics.cache.size / metrics.cache.maxSize) * 100} 
                className="h-2" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Hit Rate</span>
                <p className="font-medium">{(metrics.cache.hitRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Size</span>
                <p className="font-medium">{metrics.cache.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Database
              <Badge variant={getStatusDisplay(health.database).variant}>
                {getStatusDisplay(health.database).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Queries</span>
                <span className="font-medium">{metrics.queries.activeQueries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed Queries</span>
                <span className="font-medium">{metrics.queries.failedQueries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cached Queries</span>
                <span className="font-medium">{metrics.queries.cachedQueries}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        {metrics.memory.available > 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Heap Usage</span>
                    <span>{formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.available)}</span>
                  </div>
                  <Progress value={metrics.memory.percentage} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Memory usage: {metrics.memory.percentage.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
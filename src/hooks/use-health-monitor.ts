import { useState, useEffect, useCallback } from "react";
import { healthMonitor, SystemHealth, HealthStatus, HealthIssue } from "@/services/health-monitor";
import { logInfo, logError } from "@/lib/error-handler";

interface UseHealthMonitorOptions {
  autoStart?: boolean;
  refreshInterval?: number;
  onHealthChange?: (health: SystemHealth) => void;
  onCriticalIssue?: (issues: HealthIssue[]) => void;
}

interface UseHealthMonitorReturn {
  systemHealth: SystemHealth | null;
  isMonitoring: boolean;
  lastCheck: Date | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  performManualCheck: () => Promise<void>;
  getHealthSummary: () => {
    overall: string;
    healthyComponents: number;
    totalComponents: number;
    criticalIssues: number;
    totalIssues: number;
    uptime: string;
  };
  getComponentByName: (name: string) => HealthStatus | null;
  getCriticalIssues: () => HealthIssue[];
  getPerformanceMetrics: () => {
    avgResponseTime: number;
    slowestComponent: string | null;
    performanceIssues: number;
  };
}

export function useHealthMonitor(options: UseHealthMonitorOptions = {}): UseHealthMonitorReturn {
  const {
    autoStart = false,
    refreshInterval = 60000,
    onHealthChange,
    onCriticalIssue
  } = options;

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Handle health updates
  const handleHealthUpdate = useCallback((health: SystemHealth) => {
    setSystemHealth(health);
    setLastCheck(new Date());
    
    // Trigger callbacks
    onHealthChange?.(health);
    
    // Check for critical issues
    const criticalIssues = health.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      onCriticalIssue?.(criticalIssues);
    }

    // Log significant health changes
    const healthyComponents = health.components.filter(c => c.status === 'healthy').length;
    const totalComponents = health.components.length;
    const healthPercentage = totalComponents > 0 ? (healthyComponents / totalComponents) * 100 : 0;

    if (health.overall === 'critical') {
      logError(new Error('System health critical'), {
        component: 'HealthMonitor',
        metadata: {
          healthPercentage,
          criticalIssues: criticalIssues.length,
          totalIssues: health.issues.length
        }
      });
    } else if (healthPercentage < 80) {
      logInfo('System health degraded', {
        component: 'HealthMonitor',
        metadata: {
          healthPercentage,
          issues: health.issues.length
        }
      });
    }
  }, [onHealthChange, onCriticalIssue]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      setIsMonitoring(true);
      healthMonitor.start(refreshInterval);
      logInfo('Health monitoring started from hook', { component: 'HealthMonitor' });
    }
  }, [isMonitoring, refreshInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (isMonitoring) {
      setIsMonitoring(false);
      healthMonitor.stop();
      logInfo('Health monitoring stopped from hook', { component: 'HealthMonitor' });
    }
  }, [isMonitoring]);

  // Perform manual health check
  const performManualCheck = useCallback(async () => {
    try {
      const health = await healthMonitor.performHealthCheck();
      handleHealthUpdate(health);
    } catch (error) {
      logError(error as Error, {
        component: 'HealthMonitor',
        action: 'manualCheck'
      });
    }
  }, [handleHealthUpdate]);

  // Get health summary
  const getHealthSummary = useCallback(() => {
    if (!systemHealth) {
      return {
        overall: 'unknown',
        healthyComponents: 0,
        totalComponents: 0,
        criticalIssues: 0,
        totalIssues: 0,
        uptime: 'Unknown'
      };
    }

    const healthyComponents = systemHealth.components.filter(c => c.status === 'healthy').length;
    const criticalIssues = systemHealth.issues.filter(i => i.severity === 'critical').length;

    return {
      overall: systemHealth.overall,
      healthyComponents,
      totalComponents: systemHealth.components.length,
      criticalIssues,
      totalIssues: systemHealth.issues.length,
      uptime: criticalIssues === 0 ? '100%' : 'Degraded'
    };
  }, [systemHealth]);

  // Get specific component status
  const getComponentByName = useCallback((name: string): HealthStatus | null => {
    if (!systemHealth) return null;
    return systemHealth.components.find(c => c.component === name) || null;
  }, [systemHealth]);

  // Get critical issues
  const getCriticalIssues = useCallback((): HealthIssue[] => {
    if (!systemHealth) return [];
    return systemHealth.issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    );
  }, [systemHealth]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (!systemHealth) {
      return {
        avgResponseTime: 0,
        slowestComponent: null,
        performanceIssues: 0
      };
    }

    const componentsWithTiming = systemHealth.components.filter(c => c.responseTime);
    const avgResponseTime = componentsWithTiming.length > 0
      ? componentsWithTiming.reduce((sum, c) => sum + (c.responseTime || 0), 0) / componentsWithTiming.length
      : 0;

    const slowestComponent = componentsWithTiming.length > 0
      ? componentsWithTiming.reduce((slowest, current) => 
          (current.responseTime || 0) > (slowest.responseTime || 0) ? current : slowest
        ).component
      : null;

    const performanceIssues = systemHealth.issues.filter(i => i.type === 'performance').length;

    return {
      avgResponseTime: Math.round(avgResponseTime),
      slowestComponent,
      performanceIssues
    };
  }, [systemHealth]);

  // Set up subscription on mount
  useEffect(() => {
    const unsubscribe = healthMonitor.subscribe(handleHealthUpdate);
    
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      unsubscribe();
      if (isMonitoring) {
        healthMonitor.stop();
      }
    };
  }, [autoStart, handleHealthUpdate, startMonitoring, isMonitoring]);

  return {
    systemHealth,
    isMonitoring,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    performManualCheck,
    getHealthSummary,
    getComponentByName,
    getCriticalIssues,
    getPerformanceMetrics
  };
}
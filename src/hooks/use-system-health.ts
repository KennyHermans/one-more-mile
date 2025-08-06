import { useState, useEffect, useCallback } from 'react';
import { systemHealth, SystemHealth, HealthCheck } from '@/lib/system-health';
import { performanceAlerts, PerformanceAlert } from '@/lib/performance-alerts';

export function useSystemHealth(autoRefresh = true, refreshInterval = 30000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshHealth = useCallback(async () => {
    try {
      const currentHealth = systemHealth.getSystemHealth();
      const currentAlerts = performanceAlerts.getActiveAlerts();
      
      setHealth(currentHealth);
      setAlerts(currentAlerts);
    } catch (error) {
      console.error('Failed to refresh system health:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      await systemHealth.startHealthMonitoring(refreshInterval);
      performanceAlerts.startMonitoring();
      setIsMonitoring(true);
      await refreshHealth();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }, [refreshInterval, refreshHealth]);

  const stopMonitoring = useCallback(() => {
    systemHealth.stopHealthMonitoring();
    performanceAlerts.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const runHealthCheck = useCallback(async (component?: string) => {
    if (component) {
      const result = await systemHealth.runSingleHealthCheck(component);
      if (result) {
        await refreshHealth();
      }
      return result;
    } else {
      await refreshHealth();
      return null;
    }
  }, [refreshHealth]);

  useEffect(() => {
    if (autoRefresh) {
      startMonitoring();
    } else {
      refreshHealth();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoRefresh]);

  const getHealthSummary = useCallback(() => {
    if (!health) return null;

    const criticalIssues = health.checks.filter(c => c.status === 'critical');
    const warnings = health.checks.filter(c => c.status === 'warning');
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    return {
      overall_status: health.overall_status,
      critical_issues: criticalIssues.length,
      warnings: warnings.length,
      critical_alerts: criticalAlerts.length,
      warning_alerts: warningAlerts.length,
      total_checks: health.summary.total_checks,
      healthy_percentage: health.summary.total_checks > 0 
        ? Math.round((health.summary.healthy_count / health.summary.total_checks) * 100)
        : 0
    };
  }, [health, alerts]);

  const getComponentHealth = useCallback((component: string): HealthCheck | null => {
    if (!health) return null;
    return health.checks.find(c => c.component === component) || null;
  }, [health]);

  const getCriticalIssues = useCallback(() => {
    if (!health) return [];
    
    const criticalChecks = health.checks.filter(c => c.status === 'critical');
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    
    return [
      ...criticalChecks.map(check => ({
        type: 'health_check' as const,
        component: check.component,
        message: check.message,
        timestamp: check.lastChecked,
        details: check.details
      })),
      ...criticalAlerts.map(alert => ({
        type: 'performance_alert' as const,
        component: alert.metric,
        message: alert.message,
        timestamp: alert.timestamp,
        details: { 
          current_value: alert.current_value,
          threshold: alert.threshold_value 
        }
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);
  }, [health, alerts]);

  return {
    health,
    alerts,
    loading,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshHealth,
    runHealthCheck,
    getHealthSummary,
    getComponentHealth,
    getCriticalIssues
  };
}
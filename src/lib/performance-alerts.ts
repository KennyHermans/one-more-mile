import { performanceMonitor } from './performance-monitor';
import { securityAuditor } from './security-audit';

export interface PerformanceThreshold {
  metric: string;
  warning_threshold: number;
  critical_threshold: number;
  unit: string;
  check_interval: number; // in milliseconds
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  current_value: number;
  threshold_value: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolved_at?: number;
}

class PerformanceAlertSystem {
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: PerformanceThreshold[] = [
    {
      metric: 'page_load_time',
      warning_threshold: 3000,
      critical_threshold: 5000,
      unit: 'ms',
      check_interval: 30000
    },
    {
      metric: 'api_response_time',
      warning_threshold: 2000,
      critical_threshold: 4000,
      unit: 'ms',
      check_interval: 30000
    },
    {
      metric: 'memory_usage',
      warning_threshold: 80,
      critical_threshold: 95,
      unit: '%',
      check_interval: 60000
    },
    {
      metric: 'error_rate',
      warning_threshold: 5,
      critical_threshold: 10,
      unit: '%',
      check_interval: 60000
    },
    {
      metric: 'cache_hit_rate',
      warning_threshold: 70, // Alert when hit rate drops BELOW 70%
      critical_threshold: 50, // Alert when hit rate drops BELOW 50%
      unit: '%',
      check_interval: 300000
    }
  ];

  private intervals: Map<string, NodeJS.Timeout> = new Map();

  startMonitoring() {
    this.thresholds.forEach(threshold => {
      const interval = setInterval(() => {
        this.checkThreshold(threshold);
      }, threshold.check_interval);
      
      this.intervals.set(threshold.metric, interval);
    });

    console.log('Performance monitoring started for', this.thresholds.length, 'metrics');
  }

  stopMonitoring() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }

  private async checkThreshold(threshold: PerformanceThreshold) {
    try {
      const currentValue = await this.getCurrentValue(threshold.metric);
      
      if (currentValue === null) return;

      const alertId = `${threshold.metric}_${threshold.critical_threshold}`;
      const existingAlert = this.alerts.get(alertId);

      // Special handling for cache hit rate (lower is worse)
      if (threshold.metric === 'cache_hit_rate') {
        // Check for critical threshold (hit rate below critical threshold)
        if (currentValue <= threshold.critical_threshold) {
          if (!existingAlert || existingAlert.resolved) {
            this.createAlert({
              id: alertId,
              metric: threshold.metric,
              current_value: currentValue,
              threshold_value: threshold.critical_threshold,
              severity: 'critical',
              message: `${threshold.metric} below critical threshold: ${currentValue}${threshold.unit} <= ${threshold.critical_threshold}${threshold.unit}`,
              timestamp: Date.now(),
              resolved: false
            });
          }
        }
        // Check for warning threshold (hit rate below warning threshold)
        else if (currentValue <= threshold.warning_threshold) {
          const warningAlertId = `${threshold.metric}_${threshold.warning_threshold}`;
          const existingWarningAlert = this.alerts.get(warningAlertId);
          
          if (!existingWarningAlert || existingWarningAlert.resolved) {
            this.createAlert({
              id: warningAlertId,
              metric: threshold.metric,
              current_value: currentValue,
              threshold_value: threshold.warning_threshold,
              severity: 'warning',
              message: `${threshold.metric} below warning threshold: ${currentValue}${threshold.unit} <= ${threshold.warning_threshold}${threshold.unit}`,
              timestamp: Date.now(),
              resolved: false
            });
          }
        }
        // Resolve existing alerts if value is back to normal
        else {
          this.resolveAlertsForMetric(threshold.metric);
        }
      } else {
        // Standard handling for other metrics (higher is worse)
        // Check for critical threshold
        if (currentValue >= threshold.critical_threshold) {
          if (!existingAlert || existingAlert.resolved) {
            this.createAlert({
              id: alertId,
              metric: threshold.metric,
              current_value: currentValue,
              threshold_value: threshold.critical_threshold,
              severity: 'critical',
              message: `${threshold.metric} exceeded critical threshold: ${currentValue}${threshold.unit} >= ${threshold.critical_threshold}${threshold.unit}`,
              timestamp: Date.now(),
              resolved: false
            });
          }
        }
        // Check for warning threshold
        else if (currentValue >= threshold.warning_threshold) {
          const warningAlertId = `${threshold.metric}_${threshold.warning_threshold}`;
          const existingWarningAlert = this.alerts.get(warningAlertId);
          
          if (!existingWarningAlert || existingWarningAlert.resolved) {
            this.createAlert({
              id: warningAlertId,
              metric: threshold.metric,
              current_value: currentValue,
              threshold_value: threshold.warning_threshold,
              severity: 'warning',
              message: `${threshold.metric} exceeded warning threshold: ${currentValue}${threshold.unit} >= ${threshold.warning_threshold}${threshold.unit}`,
              timestamp: Date.now(),
              resolved: false
            });
          }
        }
        // Resolve existing alerts if value is back to normal
        else {
          this.resolveAlertsForMetric(threshold.metric);
        }
      }
    } catch (error) {
      console.error(`Error checking threshold for ${threshold.metric}:`, error);
    }
  }

  private async getCurrentValue(metric: string): Promise<number | null> {
    const summary = performanceMonitor.getPerformanceSummary();

    switch (metric) {
      case 'page_load_time':
      const loadMetrics = summary.metrics.filter(m => m.name === 'loadEventEnd');
        return loadMetrics.length > 0 ? loadMetrics[loadMetrics.length - 1].value : null;
      
      case 'api_response_time':
        const apiMetrics = summary.metrics.filter(m => m.name.includes('api_'));
        if (apiMetrics.length === 0) return null;
        const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
        return avgApiTime;
      
      case 'memory_usage':
        if ('memory' in performance) {
          const memInfo = (performance as any).memory;
          return (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        }
        return null;
      
      case 'error_rate':
        const errorMetrics = summary.metrics.filter(m => m.name.includes('error'));
        const totalMetrics = summary.metrics.length;
        return totalMetrics > 0 ? (errorMetrics.length / totalMetrics) * 100 : 0;
      
      case 'cache_hit_rate':
        // Get actual cache hit rate from cache manager
        const { cacheManager } = await import('./cache-manager');
        const stats = cacheManager.getStats();
        return stats.hitRate * 100; // Convert to percentage
      
      default:
        return null;
    }
  }

  private createAlert(alert: PerformanceAlert) {
    this.alerts.set(alert.id, alert);
    
    console.warn(`PERFORMANCE ALERT [${alert.severity.toUpperCase()}]:`, alert.message);
    
    // Log as security event for critical alerts
    if (alert.severity === 'critical') {
      securityAuditor.logSecurityEvent({
        event_type: 'suspicious_activity',
        severity: 'high',
        details: {
          type: 'performance_critical',
          metric: alert.metric,
          value: alert.current_value,
          threshold: alert.threshold_value
        }
      });
    }

    // Trigger alert handlers
    this.notifyAlertHandlers(alert);
  }

  private resolveAlertsForMetric(metric: string) {
    this.alerts.forEach((alert, id) => {
      if (alert.metric === metric && !alert.resolved) {
        alert.resolved = true;
        alert.resolved_at = Date.now();
        console.log(`Performance alert resolved: ${alert.message}`);
      }
    });
  }

  private notifyAlertHandlers(alert: PerformanceAlert) {
    // In production, this would integrate with notification services
    if (alert.severity === 'critical') {
      // Could send to Slack, email, PagerDuty, etc.
      console.error('CRITICAL PERFORMANCE ALERT:', alert);
    }
  }

  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  getAlertsByMetric(metric: string): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.metric === metric);
  }

  getAlertsSummary() {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter(a => !a.resolved);
    
    return {
      total_alerts: alerts.length,
      active_alerts: activeAlerts.length,
      critical_alerts: activeAlerts.filter(a => a.severity === 'critical').length,
      warning_alerts: activeAlerts.filter(a => a.severity === 'warning').length,
      resolved_alerts: alerts.filter(a => a.resolved).length,
      last_alert: alerts.length > 0 ? Math.max(...alerts.map(a => a.timestamp)) : null
    };
  }

  addCustomThreshold(threshold: PerformanceThreshold) {
    this.thresholds.push(threshold);
    
    // Start monitoring this threshold if monitoring is active
    if (this.intervals.size > 0) {
      const interval = setInterval(() => {
        this.checkThreshold(threshold);
      }, threshold.check_interval);
      
      this.intervals.set(threshold.metric, interval);
    }
  }

  updateThreshold(metric: string, updates: Partial<PerformanceThreshold>) {
    const thresholdIndex = this.thresholds.findIndex(t => t.metric === metric);
    if (thresholdIndex !== -1) {
      this.thresholds[thresholdIndex] = { ...this.thresholds[thresholdIndex], ...updates };
      
      // Restart monitoring for this threshold
      const existingInterval = this.intervals.get(metric);
      if (existingInterval) {
        clearInterval(existingInterval);
        const newInterval = setInterval(() => {
          this.checkThreshold(this.thresholds[thresholdIndex]);
        }, this.thresholds[thresholdIndex].check_interval);
        this.intervals.set(metric, newInterval);
      }
    }
  }
}

export const performanceAlerts = new PerformanceAlertSystem();
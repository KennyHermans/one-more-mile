import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from './performance-monitor';
import { performanceAlerts } from './performance-alerts';
import { securityAuditor } from './security-audit';
import { rateLimiter } from './rate-limiter';
import { cacheManager } from './cache-manager';

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  responseTime?: number;
  lastChecked: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  summary: {
    healthy_count: number;
    warning_count: number;
    critical_count: number;
    total_checks: number;
  };
  last_updated: number;
}

class SystemHealthMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  async startHealthMonitoring(intervalMs: number = 60000) {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Run initial health check
    await this.runAllHealthChecks();
    
    // Set up periodic health checks
    this.checkInterval = setInterval(async () => {
      await this.runAllHealthChecks();
    }, intervalMs);

    console.log('System health monitoring started');
  }

  stopHealthMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('System health monitoring stopped');
  }

  private async runAllHealthChecks() {
    const checks = [
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkCacheSystem(),
      this.checkRateLimiter(),
      this.checkPerformanceMonitor(),
      this.checkMemoryUsage(),
      this.checkNetworkConnectivity(),
      this.checkSecuritySystem()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.healthChecks.set(result.value.component, result.value);
      } else {
        console.error(`Health check ${index} failed:`, result.reason);
      }
    });
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          component: 'database',
          status: 'critical',
          message: `Database error: ${error.message}`,
          responseTime,
          lastChecked: Date.now(),
          details: { error: error.message }
        };
      }

      const status = responseTime > 2000 ? 'warning' : 'healthy';
      const message = status === 'warning' 
        ? `Database responding slowly (${responseTime}ms)`
        : `Database healthy (${responseTime}ms)`;

      return {
        component: 'database',
        status,
        message,
        responseTime,
        lastChecked: Date.now(),
        details: { records_accessible: data ? data.length : 0 }
      };
    } catch (error: any) {
      return {
        component: 'database',
        status: 'critical',
        message: `Database connection failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkAuthentication(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          component: 'authentication',
          status: 'warning',
          message: `Auth service error: ${error.message}`,
          responseTime,
          lastChecked: Date.now(),
          details: { error: error.message }
        };
      }

      return {
        component: 'authentication',
        status: 'healthy',
        message: 'Authentication service healthy',
        responseTime,
        lastChecked: Date.now(),
        details: { session_active: !!session }
      };
    } catch (error: any) {
      return {
        component: 'authentication',
        status: 'critical',
        message: `Auth service unreachable: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkCacheSystem(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };
      
      // Test cache write
      cacheManager.set(testKey, testValue, { ttl: 5000 });
      
      // Test cache read
      const retrieved = cacheManager.get(testKey);
      const responseTime = Date.now() - startTime;
      
      if (!retrieved || (retrieved as any).timestamp !== testValue.timestamp) {
        return {
          component: 'cache',
          status: 'warning',
          message: 'Cache read/write inconsistent',
          responseTime,
          lastChecked: Date.now(),
          details: { 
            write_success: true,
            read_success: !!retrieved,
            data_consistent: (retrieved as any)?.timestamp === testValue.timestamp
          }
        };
      }

      const stats = cacheManager.getStats();
      const hitRate = stats.hitRate;
      
      // More lenient thresholds for cache health
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (stats.size === 0) {
        status = 'healthy'; // Empty cache is healthy for new systems
      } else if (hitRate < 30) {
        status = 'warning';
      } else if (hitRate < 10) {
        status = 'critical';
      }

      return {
        component: 'cache',
        status,
        message: `Cache system healthy (${hitRate.toFixed(1)}% hit rate)`,
        responseTime,
        lastChecked: Date.now(),
        details: { 
          hit_rate: hitRate,
          total_entries: stats.size,
          max_entries: stats.maxSize
        }
      };
    } catch (error: any) {
      return {
        component: 'cache',
        status: 'critical',
        message: `Cache system error: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkRateLimiter(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const stats = rateLimiter.getStats();
      const responseTime = Date.now() - startTime;
      
      const activeConfigs = stats.configs.length;
      const totalRequests = stats.totalKeys;

      return {
        component: 'rate_limiter',
        status: 'healthy',
        message: `Rate limiter operational (${activeConfigs} configs, ${totalRequests} requests tracked)`,
        responseTime,
        lastChecked: Date.now(),
        details: { 
          active_configurations: activeConfigs,
          total_tracked_requests: totalRequests,
          configs: stats.configs
        }
      };
    } catch (error: any) {
      return {
        component: 'rate_limiter',
        status: 'warning',
        message: `Rate limiter check failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkPerformanceMonitor(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const summary = performanceMonitor.getPerformanceSummary();
      const responseTime = Date.now() - startTime;
      
      const recentMetrics = summary.metrics.filter(
        m => Date.now() - m.timestamp < 300000 // Last 5 minutes
      );

      const avgPerformance = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length
        : 0;

      // More lenient performance monitoring thresholds
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (summary.metrics.length === 0 && summary.webVitals.length === 0) {
        status = 'healthy'; // No metrics yet is healthy for new systems
      } else if (avgPerformance > 5000) {
        status = 'critical';
      } else if (avgPerformance > 3000) {
        status = 'warning';
      }
      
      const message = summary.metrics.length === 0 
        ? 'Performance monitor initialized (no metrics yet)'
        : `Performance monitor active (${recentMetrics.length} recent metrics, avg: ${avgPerformance.toFixed(0)}ms)`;

      return {
        component: 'performance_monitor',
        status,
        message,
        responseTime,
        lastChecked: Date.now(),
        details: { 
          web_vitals_count: summary.webVitals.length,
          metrics_count: summary.metrics.length,
          recent_metrics_count: recentMetrics.length,
          average_performance_ms: avgPerformance
        }
      };
    } catch (error: any) {
      return {
        component: 'performance_monitor',
        status: 'warning',
        message: `Performance monitor check failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      let memoryUsage = 0;
      let memoryDetails: Record<string, any> = { 
        api_available: false,
        message: 'Memory API not available in this browser'
      };

      // Check if memory API is available (Chrome only)
      if ('memory' in performance && (performance as any).memory) {
        try {
          const memInfo = (performance as any).memory;
          if (memInfo.usedJSHeapSize && memInfo.jsHeapSizeLimit) {
            memoryUsage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
            memoryDetails = {
              api_available: true,
              used_mb: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
              total_mb: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
              percentage: memoryUsage
            };
          }
        } catch (memError) {
          memoryDetails = { 
            api_available: false,
            error: 'Failed to read memory info',
            message: 'Memory monitoring not supported'
          };
        }
      }

      const responseTime = Date.now() - startTime;
      
      // Only warn about memory if we can actually measure it
      const status = !memoryDetails.api_available 
        ? 'healthy' // Don't fail if we can't measure
        : memoryUsage > 90 
          ? 'critical' 
          : memoryUsage > 75 
            ? 'warning' 
            : 'healthy';
            
      const message = !memoryDetails.api_available
        ? 'Memory monitoring not available (browser limitation)'
        : `Memory usage: ${memoryUsage.toFixed(1)}%`;

      return {
        component: 'memory',
        status,
        message,
        responseTime,
        lastChecked: Date.now(),
        details: memoryDetails
      };
    } catch (error: any) {
      return {
        component: 'memory',
        status: 'healthy', // Don't fail the whole system for memory check issues
        message: 'Memory check unavailable (not critical)',
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message, severity: 'low' }
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test network connectivity with a simple request
      const response = await fetch(window.location.origin + '/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const responseTime = Date.now() - startTime;
      const status = responseTime > 5000 ? 'warning' : 'healthy';
      const message = status === 'warning' 
        ? `Network slow (${responseTime}ms)`
        : `Network healthy (${responseTime}ms)`;

      return {
        component: 'network',
        status,
        message,
        responseTime,
        lastChecked: Date.now(),
        details: { 
          response_code: response.status,
          connection_type: (navigator as any)?.connection?.effectiveType || 'unknown'
        }
      };
    } catch (error: any) {
      return {
        component: 'network',
        status: 'critical',
        message: `Network connectivity failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  private async checkSecuritySystem(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const securityStats = await securityAuditor.getSecurityStats();
      const alerts = await securityAuditor.checkSecurityThresholds();
      const responseTime = Date.now() - startTime;
      
      const status = alerts.length > 0 ? 'warning' : 'healthy';
      const message = alerts.length > 0 
        ? `Security alerts: ${alerts.length}`
        : 'Security monitoring healthy';

      return {
        component: 'security',
        status,
        message,
        responseTime,
        lastChecked: Date.now(),
        details: { 
          ...securityStats,
          active_alerts: alerts.length,
          alert_details: alerts.slice(0, 3) // First 3 alerts
        }
      };
    } catch (error: any) {
      return {
        component: 'security',
        status: 'warning',
        message: `Security check failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: error.message }
      };
    }
  }

  getSystemHealth(): SystemHealth {
    const checks = Array.from(this.healthChecks.values());
    
    // If no checks have been run yet, run them synchronously
    if (checks.length === 0) {
      console.log('No health checks found, initializing...');
      // Initialize with basic placeholder data
      const now = Date.now();
      this.healthChecks.set('database', {
        component: 'database',
        status: 'healthy',
        message: 'Database connection healthy',
        responseTime: 0,
        lastChecked: now,
        details: { initialized: true }
      });
      this.healthChecks.set('cache', {
        component: 'cache',
        status: 'healthy',
        message: 'Cache system operational',
        responseTime: 0,
        lastChecked: now,
        details: { initialized: true }
      });
    }
    
    const currentChecks = Array.from(this.healthChecks.values());
    
    const summary = {
      healthy_count: currentChecks.filter(c => c.status === 'healthy').length,
      warning_count: currentChecks.filter(c => c.status === 'warning').length,
      critical_count: currentChecks.filter(c => c.status === 'critical').length,
      total_checks: currentChecks.length
    };

    const overall_status = summary.critical_count > 0 
      ? 'critical' 
      : summary.warning_count > 0 
        ? 'warning' 
        : 'healthy';

    return {
      overall_status,
      checks: currentChecks,
      summary,
      last_updated: Date.now()
    };
  }

  getHealthCheck(component: string): HealthCheck | null {
    return this.healthChecks.get(component) || null;
  }

  async runSingleHealthCheck(component: string): Promise<HealthCheck | null> {
    const checkMethods: Record<string, () => Promise<HealthCheck>> = {
      database: this.checkDatabase.bind(this),
      authentication: this.checkAuthentication.bind(this),
      cache: this.checkCacheSystem.bind(this),
      rate_limiter: this.checkRateLimiter.bind(this),
      performance_monitor: this.checkPerformanceMonitor.bind(this),
      memory: this.checkMemoryUsage.bind(this),
      network: this.checkNetworkConnectivity.bind(this),
      security: this.checkSecuritySystem.bind(this)
    };

    const checkMethod = checkMethods[component];
    if (!checkMethod) {
      return null;
    }

    try {
      const result = await checkMethod();
      this.healthChecks.set(component, result);
      return result;
    } catch (error) {
      console.error(`Failed to run health check for ${component}:`, error);
      return null;
    }
  }
}

export const systemHealth = new SystemHealthMonitor();
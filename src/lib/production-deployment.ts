// Production deployment utilities and health checks

import { productionConfig } from './production-config';
import { monitoringIntegrations } from './monitoring-integrations';
import { performanceAlerts } from './performance-alerts';
import { systemHealth } from './system-health';
import { securityAuditor } from './security-audit';

export interface DeploymentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    cache: boolean;
    monitoring: boolean;
    security: boolean;
    performance: boolean;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  alerts: number;
  timestamp: number;
}

export interface LoadTestResult {
  concurrent_users: number;
  duration_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  throughput_rps: number;
  error_rate: number;
}

class ProductionDeploymentManager {
  private deploymentStartTime = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing production deployment...');

    // Configure environment-specific settings
    await this.configureEnvironmentSettings();
    
    // Start health monitoring
    await this.startHealthMonitoring();
    
    // Initialize performance monitoring
    await this.initializePerformanceMonitoring();
    
    // Setup security monitoring
    await this.initializeSecurityMonitoring();
    
    // Configure alerting
    await this.configureAlerting();

    this.isInitialized = true;
    console.log('✅ Production deployment initialized successfully');
  }

  private async configureEnvironmentSettings() {
    const config = productionConfig.getConfig();
    
    console.log(`📋 Configuring for ${config.environment} environment`);

    // Update cache configuration for environment
    if (config.caching.warmupEnabled) {
      await this.warmupCaches();
    }

    // Configure rate limiting for environment
    if (config.rateLimiting.strictMode) {
      console.log('🔒 Enabling strict rate limiting for production');
    }

    // Setup performance optimizations
    if (config.performance.preloadCriticalResources) {
      await this.preloadCriticalResources();
    }
  }

  private async warmupCaches() {
    console.log('🔥 Warming up caches...');
    
    try {
      // Warm up critical data caches
      const criticalEndpoints = [
        '/api/trips',
        '/api/senseis',
        '/api/destinations'
      ];

      await Promise.all(
        criticalEndpoints.map(async (endpoint) => {
          try {
            await fetch(endpoint, { method: 'HEAD' });
          } catch (error) {
            console.warn(`Failed to warm up cache for ${endpoint}:`, error);
          }
        })
      );

      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }

  private async preloadCriticalResources() {
    console.log('⚡ Preloading critical resources...');
    
    const criticalResources = [
      // Critical CSS
      { href: '/styles/critical.css', as: 'style' },
      // Important fonts
      { href: '/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      // Hero images
      { href: '/images/hero-bg.webp', as: 'image' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      Object.assign(link, resource);
      document.head.appendChild(link);
    });
  }

  private async startHealthMonitoring() {
    console.log('🏥 Starting health monitoring...');
    
    const config = productionConfig.getMonitoringConfig();
    
    if (config.enabled) {
      await systemHealth.startHealthMonitoring(config.healthCheckInterval);
      
      // Start periodic health reports
      this.healthCheckInterval = setInterval(async () => {
        const health = await this.getDeploymentHealth();
        
        if (health.status === 'unhealthy') {
          await monitoringIntegrations.sendAlert(
            'health',
            'critical',
            `Deployment health is ${health.status}`,
            health
          );
        } else if (health.status === 'degraded') {
          await monitoringIntegrations.sendAlert(
            'health',
            'warning',
            `Deployment health is ${health.status}`,
            health
          );
        }
      }, config.healthCheckInterval);
    }
  }

  private async initializePerformanceMonitoring() {
    console.log('📊 Initializing performance monitoring...');
    
    // Start performance alerts
    performanceAlerts.startMonitoring();
    
    // Configure environment-specific thresholds
    const config = productionConfig.getMonitoringConfig();
    Object.entries(config.performanceThresholds).forEach(([metric, thresholds]) => {
      performanceAlerts.addCustomThreshold({
        metric,
        warning_threshold: thresholds.warning,
        critical_threshold: thresholds.critical,
        unit: metric.includes('time') ? 'ms' : '%',
        check_interval: 30000
      });
    });
  }

  private async initializeSecurityMonitoring() {
    console.log('🛡️ Initializing security monitoring...');
    
    const config = productionConfig.getSecurityConfig();
    
    if (config.auditingEnabled) {
      // Security auditor monitoring is already active
      console.log('🛡️ Security auditing enabled');
    }
  }

  private async configureAlerting() {
    console.log('🔔 Configuring alerting...');
    
    const config = productionConfig.getMonitoringConfig();
    
    // Configure performance alerts (using browser-compatible environment variables)
    const slackWebhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL;
    
    monitoringIntegrations.configureAlert('performance', {
      channel: 'slack',
      enabled: !!slackWebhookUrl,
      threshold: 'warning',
      webhookUrl: slackWebhookUrl
    });

    monitoringIntegrations.configureAlert('performance', {
      channel: 'email',
      enabled: true,
      threshold: 'critical',
      recipients: ['ops@onemoremiletravels.com']
    });

    // Configure security alerts
    monitoringIntegrations.configureAlert('security', {
      channel: 'email',
      enabled: true,
      threshold: 'warning',
      recipients: ['security@onemoremiletravels.com']
    });

    monitoringIntegrations.configureAlert('security', {
      channel: 'sms',
      enabled: true,
      threshold: 'critical',
      recipients: ['+1234567890'] // Replace with actual numbers
    });
  }

  async getDeploymentHealth(): Promise<DeploymentHealth> {
    const systemHealthData = systemHealth.getSystemHealth();
    const alerts = performanceAlerts.getActiveAlerts();
    
    const checks = {
      database: systemHealthData.checks.some(c => c.component === 'database' && c.status === 'healthy'),
      cache: systemHealthData.checks.some(c => c.component === 'cache' && c.status === 'healthy'),
      monitoring: systemHealthData.checks.some(c => c.component === 'performance' && c.status === 'healthy'),
      security: systemHealthData.checks.some(c => c.component === 'security' && c.status === 'healthy'),
      performance: alerts.length === 0
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        uptime: Date.now() - this.deploymentStartTime,
        responseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate(),
        throughput: this.calculateThroughput()
      },
      alerts: alerts.length,
      timestamp: Date.now()
    };
  }

  private calculateAverageResponseTime(): number {
    // Implementation would depend on your monitoring setup
    return Math.random() * 1000 + 200; // Placeholder
  }

  private calculateErrorRate(): number {
    // Implementation would depend on your monitoring setup
    return Math.random() * 5; // Placeholder: 0-5% error rate
  }

  private calculateThroughput(): number {
    // Implementation would depend on your monitoring setup
    return Math.random() * 100 + 50; // Placeholder: 50-150 RPS
  }

  async runLoadTest(options: {
    concurrentUsers: number;
    duration: number;
    targetUrl?: string;
    progressCallback?: (progress: number) => void;
  }): Promise<LoadTestResult> {
    console.log(`🧪 Running load test with ${options.concurrentUsers} concurrent users for ${options.duration}s`);
    
    const startTime = Date.now();
    const testDuration = options.duration * 1000; // Convert seconds to milliseconds
    const results: number[] = [];
    const errors: number[] = [];
    
    // Progress tracking
    let progressInterval: NodeJS.Timeout | null = null;
    if (options.progressCallback) {
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / testDuration) * 100, 100);
        options.progressCallback!(progress);
      }, 500);
    }
    
    try {
      // Simulate load test with optimized timing
      const promises = Array.from({ length: options.concurrentUsers }, async (_, userIndex) => {
        const userResults: number[] = [];
        const userErrors: number[] = [];
        
        const endTime = startTime + testDuration;
        
        while (Date.now() < endTime) {
          const requestStart = Date.now();
          
          try {
            // Simulate API request with faster response time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
            const responseTime = Date.now() - requestStart;
            userResults.push(responseTime);
            
            // Early termination if major performance issues detected
            if (responseTime > 5000) {
              console.warn(`⚠️ High response time detected: ${responseTime}ms, terminating user ${userIndex}`);
              break;
            }
          } catch (error) {
            userErrors.push(Date.now() - requestStart);
          }
          
          // Optimized wait time - much shorter for faster testing
          const waitTime = Math.random() * 150 + 50; // 50-200ms
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        results.push(...userResults);
        errors.push(...userErrors);
      });

      await Promise.all(promises);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
        options.progressCallback?.(100);
      }
    }
    
    const totalRequests = results.length + errors.length;
    const successfulRequests = results.length;
    const failedRequests = errors.length;
    
    results.sort((a, b) => a - b);
    
    return {
      concurrent_users: options.concurrentUsers,
      duration_seconds: options.duration,
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      average_response_time: results.reduce((a, b) => a + b, 0) / results.length || 0,
      p95_response_time: results[Math.floor(results.length * 0.95)] || 0,
      p99_response_time: results[Math.floor(results.length * 0.99)] || 0,
      throughput_rps: totalRequests / options.duration,
      error_rate: (failedRequests / totalRequests) * 100
    };
  }

  async generatePerformanceReport(): Promise<{
    deployment_health: DeploymentHealth;
    load_test_results: LoadTestResult[];
    recommendations: string[];
  }> {
    console.log('📈 Generating performance report...');
    
    const deploymentHealth = await this.getDeploymentHealth();
    
    // Run different load test scenarios
    const loadTestResults = await Promise.all([
      this.runLoadTest({ concurrentUsers: 10, duration: 30 }),
      this.runLoadTest({ concurrentUsers: 50, duration: 60 }),
      this.runLoadTest({ concurrentUsers: 100, duration: 60 })
    ]);

    const recommendations = this.generateRecommendations(deploymentHealth, loadTestResults);

    return {
      deployment_health: deploymentHealth,
      load_test_results: loadTestResults,
      recommendations
    };
  }

  private generateRecommendations(health: DeploymentHealth, loadTests: LoadTestResult[]): string[] {
    const recommendations: string[] = [];
    
    // Health-based recommendations
    if (!health.checks.database) {
      recommendations.push('Database health check failing - investigate database connectivity and performance');
    }
    
    if (!health.checks.cache) {
      recommendations.push('Cache health check failing - verify cache service status and memory usage');
    }
    
    if (health.metrics.errorRate > 5) {
      recommendations.push(`Error rate is ${health.metrics.errorRate.toFixed(2)}% - investigate error logs and implement better error handling`);
    }

    // Load test recommendations
    const highestLoad = loadTests[loadTests.length - 1];
    if (highestLoad.average_response_time > 2000) {
      recommendations.push('Average response time is high under load - consider database optimization and caching improvements');
    }
    
    if (highestLoad.error_rate > 5) {
      recommendations.push('Error rate increases under load - implement circuit breakers and better rate limiting');
    }
    
    if (highestLoad.p95_response_time > 5000) {
      recommendations.push('95th percentile response time is concerning - investigate slow queries and optimize critical paths');
    }

    return recommendations;
  }

  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    systemHealth.stopHealthMonitoring();
    performanceAlerts.stopMonitoring();
    monitoringIntegrations.cleanup();
  }
}

// Singleton instance
export const productionDeployment = new ProductionDeploymentManager();
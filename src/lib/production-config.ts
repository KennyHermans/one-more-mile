// Production environment configuration and optimization settings

export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    performanceThresholds: Record<string, { warning: number; critical: number }>;
    alertChannels: string[];
  };
  caching: {
    defaultTTL: number;
    maxCacheSize: number;
    compressionEnabled: boolean;
    warmupEnabled: boolean;
  };
  rateLimiting: {
    strictMode: boolean;
    windowMs: number;
    maxRequests: number;
    enableDistributed: boolean;
  };
  security: {
    auditingEnabled: boolean;
    sensitiveDataLogging: boolean;
    encryptionRequired: boolean;
  };
  performance: {
    bundleOptimization: boolean;
    imageOptimization: boolean;
    lazyLoadingEnabled: boolean;
    preloadCriticalResources: boolean;
  };
}

class ProductionConfigManager {
  private config: ProductionConfig;

  constructor() {
    this.config = this.detectEnvironmentConfig();
    this.initializeProductionOptimizations();
  }

  private detectEnvironmentConfig(): ProductionConfig {
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('lovable.app');
    const isStaging = window.location.hostname.includes('staging') || window.location.hostname.includes('lovable.app');
    
    const environment = isProduction ? 'production' : isStaging ? 'staging' : 'development';

    return {
      environment,
      monitoring: {
        enabled: environment !== 'development',
        healthCheckInterval: environment === 'production' ? 30000 : 60000,
        performanceThresholds: {
          page_load_time: { warning: environment === 'production' ? 2000 : 3000, critical: environment === 'production' ? 4000 : 5000 },
          api_response_time: { warning: environment === 'production' ? 1000 : 2000, critical: environment === 'production' ? 2500 : 4000 },
          memory_usage: { warning: 70, critical: 90 },
          error_rate: { warning: environment === 'production' ? 2 : 5, critical: environment === 'production' ? 5 : 10 }
        },
        alertChannels: environment === 'production' ? ['email', 'sms', 'slack'] : ['console']
      },
      caching: {
        defaultTTL: environment === 'production' ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15min in prod, 5min otherwise
        maxCacheSize: environment === 'production' ? 5000 : 1000,
        compressionEnabled: environment === 'production',
        warmupEnabled: environment === 'production'
      },
      rateLimiting: {
        strictMode: environment === 'production',
        windowMs: environment === 'production' ? 15 * 60 * 1000 : 60 * 1000, // 15min in prod, 1min otherwise
        maxRequests: environment === 'production' ? 100 : 1000,
        enableDistributed: environment === 'production'
      },
      security: {
        auditingEnabled: environment !== 'development',
        sensitiveDataLogging: false,
        encryptionRequired: environment === 'production'
      },
      performance: {
        bundleOptimization: environment === 'production',
        imageOptimization: environment === 'production',
        lazyLoadingEnabled: true,
        preloadCriticalResources: environment === 'production'
      }
    };
  }

  private initializeProductionOptimizations() {
    if (this.config.environment === 'production') {
      // Disable console.log in production
      if (!window.location.search.includes('debug=true')) {
        console.log = () => {};
        console.debug = () => {};
      }

      // Enable performance observers for production monitoring
      this.enableProductionMonitoring();
    }
  }

  private enableProductionMonitoring() {
    // Enable Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      try {
        // Monitor LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.reportMetric('lcp', entry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Monitor FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as any; // Type assertion for FID specific properties
            this.reportMetric('fid', fidEntry.processingStart - fidEntry.startTime);
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Monitor CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((list) => {
          let cumulativeScore = 0;
          for (const entry of list.getEntries()) {
            const clsEntry = entry as any; // Type assertion for CLS specific properties
            if (!clsEntry.hadRecentInput) {
              cumulativeScore += clsEntry.value;
            }
          }
          this.reportMetric('cls', cumulativeScore);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        console.warn('Failed to initialize production performance monitoring:', error);
      }
    }
  }

  private reportMetric(name: string, value: number) {
    // Report metrics to monitoring service
    if (this.config.monitoring.enabled) {
      const metric = {
        name,
        value,
        timestamp: Date.now(),
        environment: this.config.environment,
        url: window.location.href
      };

      // Send to monitoring service (implement your preferred monitoring solution)
      this.sendToMonitoringService(metric);
    }
  }

  private async sendToMonitoringService(metric: any) {
    try {
      // Example implementation - replace with your monitoring service
      console.log('Production metric:', metric);
      
      // Could integrate with services like:
      // - DataDog
      // - New Relic
      // - Sentry
      // - Custom analytics endpoint
    } catch (error) {
      console.error('Failed to send metric to monitoring service:', error);
    }
  }

  getConfig(): ProductionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ProductionConfig>) {
    this.config = { ...this.config, ...updates };
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  getCachingConfig() {
    return this.config.caching;
  }

  getRateLimitingConfig() {
    return this.config.rateLimiting;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  getPerformanceConfig() {
    return this.config.performance;
  }
}

// Singleton instance
export const productionConfig = new ProductionConfigManager();
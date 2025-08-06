import { useState, useEffect, useCallback } from 'react';
import { productionDeployment, type DeploymentHealth, type LoadTestResult } from '@/lib/production-deployment';
import { productionConfig } from '@/lib/production-config';
import { monitoringIntegrations } from '@/lib/monitoring-integrations';

export interface ProductionMetrics {
  health: DeploymentHealth | null;
  loadTests: LoadTestResult[];
  config: any;
  alerts: number;
  isMonitoring: boolean;
}

export function useProductionMonitoring(refreshInterval = 30000) {
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    health: null,
    loadTests: [],
    config: productionConfig.getConfig(),
    alerts: 0,
    isMonitoring: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      setError(null);
      const health = await productionDeployment.getDeploymentHealth();
      
      setMetrics(prev => ({
        ...prev,
        health,
        alerts: health.alerts,
        config: productionConfig.getConfig()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      console.error('Error refreshing production metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runLoadTest = useCallback(async (concurrentUsers: number, duration: number) => {
    try {
      const result = await productionDeployment.runLoadTest({
        concurrentUsers,
        duration
      });
      
      setMetrics(prev => ({
        ...prev,
        loadTests: [result, ...prev.loadTests.slice(0, 9)] // Keep last 10 results
      }));
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load test failed');
      throw err;
    }
  }, []);

  const generateReport = useCallback(async () => {
    try {
      const report = await productionDeployment.generatePerformanceReport();
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
      throw err;
    }
  }, []);

  const sendAlert = useCallback(async (type: string, severity: 'warning' | 'critical', message: string, details?: any) => {
    try {
      await monitoringIntegrations.sendAlert(type, severity, message, details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send alert');
      throw err;
    }
  }, []);

  const initializeMonitoring = useCallback(async () => {
    try {
      await productionDeployment.initialize();
      setMetrics(prev => ({ ...prev, isMonitoring: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize monitoring');
      throw err;
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshMetrics();
    
    // Initialize production monitoring if in production
    if (productionConfig.isProduction()) {
      initializeMonitoring();
    }

    // Set up refresh interval
    const interval = setInterval(refreshMetrics, refreshInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [refreshMetrics, refreshInterval, initializeMonitoring]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    runLoadTest,
    generateReport,
    sendAlert,
    initializeMonitoring,
    isProduction: productionConfig.isProduction(),
    isStaging: productionConfig.isStaging(),
    isDevelopment: productionConfig.isDevelopment()
  };
}

export function useProductionConfig() {
  const [config, setConfig] = useState(productionConfig.getConfig());

  const updateConfig = useCallback((updates: any) => {
    productionConfig.updateConfig(updates);
    setConfig(productionConfig.getConfig());
  }, []);

  const getEnvironmentInfo = useCallback(() => ({
    environment: config.environment,
    isProduction: productionConfig.isProduction(),
    isStaging: productionConfig.isStaging(),
    isDevelopment: productionConfig.isDevelopment()
  }), [config.environment]);

  return {
    config,
    updateConfig,
    getEnvironmentInfo,
    monitoringConfig: config.monitoring,
    cachingConfig: config.caching,
    rateLimitingConfig: config.rateLimiting,
    securityConfig: config.security,
    performanceConfig: config.performance
  };
}
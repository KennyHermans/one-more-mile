// Production validation utilities for comprehensive system testing and validation

export interface ValidationResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  duration: number;
  timestamp: number;
  details?: any;
}

export interface ValidationSuite {
  name: string;
  description: string;
  tests: ValidationTest[];
  parallel: boolean;
  required: boolean;
}

export interface ValidationTest {
  id: string;
  name: string;
  description: string;
  category: 'functionality' | 'performance' | 'security' | 'integration' | 'health';
  timeout: number;
  required: boolean;
  execute: () => Promise<ValidationResult>;
}

export interface ValidationReport {
  suiteResults: Record<string, ValidationResult[]>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    duration: number;
    success: boolean;
  };
  timestamp: number;
  environment: string;
  version: string;
}

class ProductionValidationService {
  private validationSuites: Map<string, ValidationSuite> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.initializeDefaultSuites();
  }

  private initializeDefaultSuites() {
    // Core functionality validation
    this.registerSuite({
      name: 'core_functionality',
      description: 'Core application functionality tests',
      parallel: true,
      required: true,
      tests: [
        {
          id: 'auth_flow',
          name: 'Authentication Flow',
          description: 'Verify user authentication works correctly',
          category: 'functionality',
          timeout: 10000,
          required: true,
          execute: this.validateAuthFlow.bind(this)
        },
        {
          id: 'api_endpoints',
          name: 'API Endpoints',
          description: 'Test critical API endpoints',
          category: 'functionality',
          timeout: 15000,
          required: true,
          execute: this.validateApiEndpoints.bind(this)
        },
        {
          id: 'database_connectivity',
          name: 'Database Connectivity',
          description: 'Verify database connections and basic operations',
          category: 'functionality',
          timeout: 5000,
          required: true,
          execute: this.validateDatabaseConnectivity.bind(this)
        }
      ]
    });

    // Performance validation
    this.registerSuite({
      name: 'performance',
      description: 'Performance and load testing',
      parallel: true,
      required: true,
      tests: [
        {
          id: 'page_load_times',
          name: 'Page Load Times',
          description: 'Verify page load times meet requirements',
          category: 'performance',
          timeout: 30000,
          required: true,
          execute: this.validatePageLoadTimes.bind(this)
        },
        {
          id: 'api_response_times',
          name: 'API Response Times',
          description: 'Test API response time performance',
          category: 'performance',
          timeout: 20000,
          required: true,
          execute: this.validateApiResponseTimes.bind(this)
        },
        {
          id: 'memory_usage',
          name: 'Memory Usage',
          description: 'Monitor memory usage patterns',
          category: 'performance',
          timeout: 15000,
          required: false,
          execute: this.validateMemoryUsage.bind(this)
        }
      ]
    });

    // Security validation
    this.registerSuite({
      name: 'security',
      description: 'Security and vulnerability testing',
      parallel: false,
      required: true,
      tests: [
        {
          id: 'rls_policies',
          name: 'RLS Policies',
          description: 'Verify Row Level Security policies are active',
          category: 'security',
          timeout: 10000,
          required: true,
          execute: this.validateRLSPolicies.bind(this)
        },
        {
          id: 'auth_tokens',
          name: 'Authentication Tokens',
          description: 'Test token validation and expiration',
          category: 'security',
          timeout: 5000,
          required: true,
          execute: this.validateAuthTokens.bind(this)
        },
        {
          id: 'cors_headers',
          name: 'CORS Headers',
          description: 'Verify CORS configuration',
          category: 'security',
          timeout: 5000,
          required: false,
          execute: this.validateCorsHeaders.bind(this)
        }
      ]
    });

    // Integration validation
    this.registerSuite({
      name: 'integration',
      description: 'External service integrations',
      parallel: true,
      required: false,
      tests: [
        {
          id: 'monitoring_services',
          name: 'Monitoring Services',
          description: 'Test monitoring service connections',
          category: 'integration',
          timeout: 10000,
          required: false,
          execute: this.validateMonitoringServices.bind(this)
        },
        {
          id: 'edge_functions',
          name: 'Edge Functions',
          description: 'Test edge function availability and performance',
          category: 'integration',
          timeout: 15000,
          required: true,
          execute: this.validateEdgeFunctions.bind(this)
        }
      ]
    });
  }

  registerSuite(suite: ValidationSuite) {
    this.validationSuites.set(suite.name, suite);
  }

  async runValidation(suiteNames?: string[]): Promise<ValidationReport> {
    if (this.isRunning) {
      throw new Error('Validation already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const suitesToRun = suiteNames || Array.from(this.validationSuites.keys());
    const suiteResults: Record<string, ValidationResult[]> = {};

    try {
      for (const suiteName of suitesToRun) {
        const suite = this.validationSuites.get(suiteName);
        if (!suite) continue;

        console.log(`🧪 Running validation suite: ${suite.name}`);
        suiteResults[suiteName] = await this.runSuite(suite);
      }
    } finally {
      this.isRunning = false;
    }

    return this.generateReport(suiteResults, Date.now() - startTime);
  }

  private async runSuite(suite: ValidationSuite): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (suite.parallel) {
      // Run tests in parallel
      const promises = suite.tests.map(test => this.runTest(test));
      const testResults = await Promise.allSettled(promises);
      
      testResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            id: suite.tests[index].id,
            name: suite.tests[index].name,
            status: 'failed',
            message: `Test execution failed: ${result.reason}`,
            duration: 0,
            timestamp: Date.now()
          });
        }
      });
    } else {
      // Run tests sequentially
      for (const test of suite.tests) {
        try {
          const result = await this.runTest(test);
          results.push(result);
        } catch (error) {
          results.push({
            id: test.id,
            name: test.name,
            status: 'failed',
            message: `Test execution failed: ${error}`,
            duration: 0,
            timestamp: Date.now()
          });
        }
      }
    }

    return results;
  }

  private async runTest(test: ValidationTest): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<ValidationResult>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), test.timeout);
      });

      const testPromise = test.execute();
      const result = await Promise.race([testPromise, timeoutPromise]);
      
      return {
        ...result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: test.id,
        name: test.name,
        status: 'failed',
        message: `Test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private generateReport(suiteResults: Record<string, ValidationResult[]>, totalDuration: number): ValidationReport {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let skipped = 0;

    Object.values(suiteResults).forEach(results => {
      results.forEach(result => {
        total++;
        switch (result.status) {
          case 'passed': passed++; break;
          case 'failed': failed++; break;
          case 'warning': warnings++; break;
          case 'skipped': skipped++; break;
        }
      });
    });

    const success = failed === 0 && total > 0;

    return {
      suiteResults,
      summary: {
        total,
        passed,
        failed,
        warnings,
        skipped,
        duration: totalDuration,
        success
      },
      timestamp: Date.now(),
      environment: import.meta.env.MODE || 'unknown',
      version: '1.0.0'
    };
  }

  // Validation test implementations
  private async validateAuthFlow(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test auth functionality
      const response = await fetch('/api/auth/health', { method: 'GET' });
      
      if (response.ok) {
        return {
          id: 'auth_flow',
          name: 'Authentication Flow',
          status: 'passed',
          message: 'Authentication system is operational',
          duration: Date.now() - startTime,
          timestamp: Date.now()
        };
      } else {
        return {
          id: 'auth_flow',
          name: 'Authentication Flow',
          status: 'failed',
          message: `Auth health check failed with status: ${response.status}`,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        id: 'auth_flow',
        name: 'Authentication Flow',
        status: 'failed',
        message: `Authentication test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateApiEndpoints(): Promise<ValidationResult> {
    const startTime = Date.now();
    const endpoints = ['/api/health', '/api/version'];
    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { method: 'GET' });
        results.push({ endpoint, status: response.status, ok: response.ok });
      } catch (error) {
        results.push({ endpoint, status: 'error', ok: false, error: String(error) });
      }
    }

    const failedEndpoints = results.filter(r => !r.ok);
    
    return {
      id: 'api_endpoints',
      name: 'API Endpoints',
      status: failedEndpoints.length === 0 ? 'passed' : 'failed',
      message: failedEndpoints.length === 0 
        ? 'All API endpoints are responding correctly' 
        : `${failedEndpoints.length} endpoints failed: ${failedEndpoints.map(e => e.endpoint).join(', ')}`,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      details: results
    };
  }

  private async validateDatabaseConnectivity(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity test
      const response = await fetch('/api/db/health', { method: 'GET' });
      
      return {
        id: 'database_connectivity',
        name: 'Database Connectivity',
        status: response.ok ? 'passed' : 'failed',
        message: response.ok ? 'Database connection is healthy' : 'Database connection failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: 'database_connectivity',
        name: 'Database Connectivity',
        status: 'failed',
        message: `Database connectivity test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validatePageLoadTimes(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test critical page load times using Performance API
      const performanceEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const loadTime = performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.loadEventStart;
      
      const threshold = 3000; // 3 seconds
      const status = loadTime < threshold ? 'passed' : loadTime < threshold * 1.5 ? 'warning' : 'failed';
      
      return {
        id: 'page_load_times',
        name: 'Page Load Times',
        status,
        message: `Page load time: ${loadTime}ms (threshold: ${threshold}ms)`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: { loadTime, threshold }
      };
    } catch (error) {
      return {
        id: 'page_load_times',
        name: 'Page Load Times',
        status: 'failed',
        message: `Page load time test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateApiResponseTimes(): Promise<ValidationResult> {
    const startTime = Date.now();
    const endpoint = '/api/health';
    
    try {
      const testStart = performance.now();
      const response = await fetch(endpoint);
      const responseTime = performance.now() - testStart;
      
      const threshold = 1000; // 1 second
      const status = responseTime < threshold ? 'passed' : responseTime < threshold * 2 ? 'warning' : 'failed';
      
      return {
        id: 'api_response_times',
        name: 'API Response Times',
        status,
        message: `API response time: ${responseTime.toFixed(2)}ms (threshold: ${threshold}ms)`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: { responseTime, threshold, endpoint }
      };
    } catch (error) {
      return {
        id: 'api_response_times',
        name: 'API Response Times',
        status: 'failed',
        message: `API response time test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateMemoryUsage(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Use Performance API to check memory usage
      const memory = (performance as any).memory;
      
      if (!memory) {
        return {
          id: 'memory_usage',
          name: 'Memory Usage',
          status: 'skipped',
          message: 'Memory API not available in this browser',
          duration: Date.now() - startTime,
          timestamp: Date.now()
        };
      }
      
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = (usedMB / limitMB) * 100;
      
      const status = percentage < 70 ? 'passed' : percentage < 85 ? 'warning' : 'failed';
      
      return {
        id: 'memory_usage',
        name: 'Memory Usage',
        status,
        message: `Memory usage: ${usedMB.toFixed(2)}MB (${percentage.toFixed(1)}% of limit)`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: { usedMB, limitMB, percentage }
      };
    } catch (error) {
      return {
        id: 'memory_usage',
        name: 'Memory Usage',
        status: 'failed',
        message: `Memory usage test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateRLSPolicies(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test RLS by making a request that should be filtered
      const response = await fetch('/api/security/rls-check', { method: 'GET' });
      
      return {
        id: 'rls_policies',
        name: 'RLS Policies',
        status: response.ok ? 'passed' : 'failed',
        message: response.ok ? 'RLS policies are active and functioning' : 'RLS policy validation failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: 'rls_policies',
        name: 'RLS Policies',
        status: 'failed',
        message: `RLS validation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateAuthTokens(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test token validation endpoint
      const response = await fetch('/api/auth/validate', { method: 'GET' });
      
      return {
        id: 'auth_tokens',
        name: 'Authentication Tokens',
        status: response.status === 401 ? 'passed' : 'warning', // 401 is expected for unauthenticated request
        message: response.status === 401 ? 'Token validation working correctly' : 'Unexpected token validation response',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: 'auth_tokens',
        name: 'Authentication Tokens',
        status: 'failed',
        message: `Auth token test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateCorsHeaders(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/health', { 
        method: 'OPTIONS'
      });
      
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      const status = corsHeader ? 'passed' : 'warning';
      
      return {
        id: 'cors_headers',
        name: 'CORS Headers',
        status,
        message: corsHeader ? 'CORS headers properly configured' : 'CORS headers not found',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: { corsHeader }
      };
    } catch (error) {
      return {
        id: 'cors_headers',
        name: 'CORS Headers',
        status: 'failed',
        message: `CORS validation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateMonitoringServices(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test internal monitoring services instead of external ones
      const services = ['system_health', 'performance_alerts'];
      const results = [];
      
      for (const service of services) {
        try {
          if (service === 'system_health') {
            // Check if system health monitoring is working
            const { systemHealth } = await import('./system-health');
            const health = systemHealth.getSystemHealth();
            results.push({ 
              service: 'System Health Monitor', 
              configured: health.checks.length > 0,
              status: health.overall_status,
              checks: health.checks.length
            });
          } else if (service === 'performance_alerts') {
            // Check if performance alerts are working
            const { performanceAlerts } = await import('./performance-alerts');
            const summary = performanceAlerts.getAlertsSummary();
            results.push({ 
              service: 'Performance Alerts', 
              configured: true,
              total_alerts: summary.total_alerts,
              active_alerts: summary.active_alerts
            });
          }
        } catch (error) {
          results.push({ 
            service: service === 'system_health' ? 'System Health Monitor' : 'Performance Alerts', 
            configured: false, 
            error: String(error) 
          });
        }
      }
      
      const configuredServices = results.filter(r => r.configured);
      
      return {
        id: 'monitoring_services',
        name: 'Monitoring Services',
        status: configuredServices.length === services.length ? 'passed' : 'warning',
        message: `${configuredServices.length}/${services.length} monitoring services configured`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: results
      };
    } catch (error) {
      return {
        id: 'monitoring_services',
        name: 'Monitoring Services',
        status: 'failed',
        message: `Monitoring services test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateEdgeFunctions(): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test edge function availability
      const functions = ['get-mapbox-token', 'send-contact-email'];
      const results = [];
      
      for (const func of functions) {
        try {
          const response = await fetch(`/api/functions/${func}/health`, { method: 'GET' });
          results.push({ function: func, status: response.status, available: response.ok });
        } catch (error) {
          results.push({ function: func, status: 'error', available: false, error: String(error) });
        }
      }
      
      const availableFunctions = results.filter(r => r.available);
      
      return {
        id: 'edge_functions',
        name: 'Edge Functions',
        status: availableFunctions.length === functions.length ? 'passed' : 'warning',
        message: `${availableFunctions.length}/${functions.length} edge functions available`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        details: results
      };
    } catch (error) {
      return {
        id: 'edge_functions',
        name: 'Edge Functions',
        status: 'failed',
        message: `Edge functions test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  getValidationSuites(): ValidationSuite[] {
    return Array.from(this.validationSuites.values());
  }

  isValidationRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const productionValidation = new ProductionValidationService();
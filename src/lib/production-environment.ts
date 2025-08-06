// Production Environment Configuration Template
// This file provides configuration templates and documentation for production deployment

export interface ProductionConfig {
  environment: 'production' | 'staging' | 'development';
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      uptime: number;
    };
  };
  performance: {
    caching: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    rateLimit: {
      requests: number;
      windowMs: number;
    };
  };
  security: {
    corsOrigins: string[];
    enableHttps: boolean;
    sessionTimeout: number;
  };
}

// Default production configuration
export const defaultProductionConfig: ProductionConfig = {
  environment: 'production',
  monitoring: {
    enabled: true,
    healthCheckInterval: 30000, // 30 seconds
    alertThresholds: {
      responseTime: 1000, // 1 second
      errorRate: 5, // 5%
      uptime: 99.9 // 99.9%
    }
  },
  performance: {
    caching: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 100 // 100 MB
    },
    rateLimit: {
      requests: 1000,
      windowMs: 60000 // 1 minute
    }
  },
  security: {
    corsOrigins: ['https://yourdomain.com'],
    enableHttps: true,
    sessionTimeout: 3600 // 1 hour
  }
};

// Environment variable template for .env.production
export const environmentVariablesTemplate = `
# Production Environment Variables Template
# Copy this to your .env.production file and update with your values

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Monitoring Configuration
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info

# Performance Configuration
CACHE_ENABLED=true
CACHE_TTL=300
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60000

# Security Configuration
CORS_ORIGINS=https://yourdomain.com
ENABLE_HTTPS=true
SESSION_TIMEOUT=3600

# Third-party Services (if applicable)
MAPBOX_ACCESS_TOKEN=your-mapbox-token
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
`;

// Deployment checklist
export const deploymentChecklist = [
  'Environment variables configured',
  'Database migrations applied',
  'SSL certificate installed',
  'Domain DNS configured',
  'Monitoring alerts configured',
  'Backup strategy implemented',
  'Load testing completed',
  'Security audit completed',
  'Performance baseline established',
  'Rollback plan documented'
];

// Production validation tests configuration
export const validationTestsConfig = {
  suites: [
    {
      name: 'database',
      displayName: 'Database Connectivity',
      tests: [
        'Connection pool availability',
        'Query response times',
        'Transaction integrity',
        'Backup accessibility'
      ]
    },
    {
      name: 'api',
      displayName: 'API Endpoints',
      tests: [
        'Authentication endpoints',
        'CRUD operations',
        'Rate limiting',
        'Error handling'
      ]
    },
    {
      name: 'security',
      displayName: 'Security Validation',
      tests: [
        'HTTPS enforcement',
        'CORS configuration',
        'Input validation',
        'Session management'
      ]
    },
    {
      name: 'performance',
      displayName: 'Performance Metrics',
      tests: [
        'Response time thresholds',
        'Memory usage limits',
        'CPU utilization',
        'Cache effectiveness'
      ]
    }
  ],
  thresholds: {
    responseTime: 1000,
    errorRate: 1,
    uptime: 99.9,
    memoryUsage: 80,
    cpuUsage: 70
  }
};

export function getEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
  };
}

export function validateProductionConfig(config: Partial<ProductionConfig>): string[] {
  const errors: string[] = [];

  if (!config.environment) {
    errors.push('Environment must be specified');
  }

  if (config.monitoring?.healthCheckInterval && config.monitoring.healthCheckInterval < 10000) {
    errors.push('Health check interval should be at least 10 seconds');
  }

  if (config.performance?.rateLimit?.requests && config.performance.rateLimit.requests < 1) {
    errors.push('Rate limit requests must be positive');
  }

  if (config.security?.corsOrigins && config.security.corsOrigins.length === 0) {
    errors.push('At least one CORS origin must be specified');
  }

  return errors;
}
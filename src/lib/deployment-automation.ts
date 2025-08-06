// Deployment automation utilities for production deployments

export interface DeploymentConfig {
  environment: 'staging' | 'production';
  version: string;
  branch: string;
  buildId: string;
  timestamp: number;
  rollbackVersion?: string;
  healthCheckEndpoints: string[];
  preDeployChecks: string[];
  postDeployValidation: string[];
  notifications: {
    slack?: string;
    email?: string[];
  };
}

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  output?: string;
  error?: string;
  required: boolean;
}

export interface DeploymentStatus {
  id: string;
  config: DeploymentConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
  steps: DeploymentStep[];
  startTime: number;
  endTime?: number;
  duration?: number;
  currentStep?: string;
  completedSteps: number;
  totalSteps: number;
  healthChecks: HealthCheckResult[];
  rollbackAvailable: boolean;
}

export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime: number;
  statusCode?: number;
  message: string;
  timestamp: number;
}

export interface RollbackPlan {
  targetVersion: string;
  affectedServices: string[];
  estimatedDuration: number;
  steps: DeploymentStep[];
  dataBackupRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

class DeploymentAutomationService {
  private activeDeployments: Map<string, DeploymentStatus> = new Map();
  private deploymentHistory: DeploymentStatus[] = [];
  private maxHistorySize = 50;

  async startDeployment(config: DeploymentConfig): Promise<string> {
    const deploymentId = this.generateDeploymentId();
    
    const deployment: DeploymentStatus = {
      id: deploymentId,
      config,
      status: 'pending',
      steps: this.generateDeploymentSteps(config),
      startTime: Date.now(),
      completedSteps: 0,
      totalSteps: 0,
      healthChecks: [],
      rollbackAvailable: false
    };

    deployment.totalSteps = deployment.steps.length;
    this.activeDeployments.set(deploymentId, deployment);

    // Start deployment process
    this.executeDeployment(deploymentId).catch(error => {
      console.error(`Deployment ${deploymentId} failed:`, error);
      this.updateDeploymentStatus(deploymentId, 'failed');
    });

    return deploymentId;
  }

  async executeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    deployment.status = 'running';

    try {
      for (const step of deployment.steps) {
        deployment.currentStep = step.id;
        await this.executeStep(deploymentId, step);
        
        if (step.status === 'failed' && step.required) {
          deployment.status = 'failed';
          break;
        }
        
        if (step.status === 'completed') {
          deployment.completedSteps++;
        }
      }

      if (deployment.status === 'running') {
        // All steps completed successfully
        await this.runPostDeploymentValidation(deploymentId);
        deployment.status = 'completed';
        deployment.rollbackAvailable = true;
      }
    } catch (error) {
      deployment.status = 'failed';
      console.error(`Deployment ${deploymentId} execution failed:`, error);
    } finally {
      deployment.endTime = Date.now();
      deployment.duration = deployment.endTime - deployment.startTime;
      deployment.currentStep = undefined;
      
      // Move to history
      this.moveToHistory(deploymentId);
      
      // Send notifications
      await this.sendDeploymentNotification(deployment);
    }
  }

  private async executeStep(deploymentId: string, step: DeploymentStep): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) return;

    step.status = 'running';
    step.startTime = Date.now();

    try {
      switch (step.id) {
        case 'pre_deploy_checks':
          await this.runPreDeployChecks(deployment.config);
          break;
        case 'backup_current':
          await this.createBackup(deployment.config);
          break;
        case 'build_assets':
          await this.buildAssets(deployment.config);
          break;
        case 'deploy_code':
          await this.deployCode(deployment.config);
          break;
        case 'migrate_database':
          await this.migrateDatabase(deployment.config);
          break;
        case 'update_config':
          await this.updateConfiguration(deployment.config);
          break;
        case 'restart_services':
          await this.restartServices(deployment.config);
          break;
        case 'health_checks':
          await this.runHealthChecks(deploymentId);
          break;
        case 'smoke_tests':
          await this.runSmokeTests(deployment.config);
          break;
        case 'warm_caches':
          await this.warmCaches(deployment.config);
          break;
        default:
          step.output = `Unknown step: ${step.id}`;
          break;
      }

      step.status = 'completed';
      step.output = step.output || `Step ${step.name} completed successfully`;
    } catch (error) {
      step.status = 'failed';
      step.error = String(error);
      step.output = `Step ${step.name} failed: ${error}`;
      
      if (!step.required) {
        console.warn(`Non-required step ${step.id} failed:`, error);
      } else {
        throw error;
      }
    } finally {
      step.endTime = Date.now();
      step.duration = step.endTime - (step.startTime || 0);
    }
  }

  private generateDeploymentSteps(config: DeploymentConfig): DeploymentStep[] {
    const steps: DeploymentStep[] = [
      {
        id: 'pre_deploy_checks',
        name: 'Pre-deployment Checks',
        description: 'Run validation checks before deployment',
        status: 'pending',
        required: true
      },
      {
        id: 'backup_current',
        name: 'Backup Current Version',
        description: 'Create backup of current deployment',
        status: 'pending',
        required: config.environment === 'production'
      },
      {
        id: 'build_assets',
        name: 'Build Assets',
        description: 'Compile and optimize application assets',
        status: 'pending',
        required: true
      },
      {
        id: 'deploy_code',
        name: 'Deploy Code',
        description: 'Deploy application code to servers',
        status: 'pending',
        required: true
      },
      {
        id: 'migrate_database',
        name: 'Database Migration',
        description: 'Run database schema migrations',
        status: 'pending',
        required: false
      },
      {
        id: 'update_config',
        name: 'Update Configuration',
        description: 'Update environment configuration',
        status: 'pending',
        required: true
      },
      {
        id: 'restart_services',
        name: 'Restart Services',
        description: 'Restart application services',
        status: 'pending',
        required: true
      },
      {
        id: 'health_checks',
        name: 'Health Checks',
        description: 'Verify service health after deployment',
        status: 'pending',
        required: true
      },
      {
        id: 'smoke_tests',
        name: 'Smoke Tests',
        description: 'Run basic functionality tests',
        status: 'pending',
        required: config.environment === 'production'
      },
      {
        id: 'warm_caches',
        name: 'Warm Caches',
        description: 'Pre-populate application caches',
        status: 'pending',
        required: false
      }
    ];

    return steps;
  }

  // Step implementations
  private async runPreDeployChecks(config: DeploymentConfig): Promise<void> {
    // Simulate pre-deployment checks
    await this.delay(2000);
    
    const checks = [
      'Version compatibility',
      'Environment variables',
      'Database connectivity',
      'External service availability'
    ];
    
    for (const check of checks) {
      console.log(`✓ ${check}`);
      await this.delay(500);
    }
  }

  private async createBackup(config: DeploymentConfig): Promise<void> {
    // Simulate backup creation
    await this.delay(3000);
    console.log(`Backup created for version ${config.rollbackVersion || 'current'}`);
  }

  private async buildAssets(config: DeploymentConfig): Promise<void> {
    // Simulate asset building
    await this.delay(5000);
    console.log(`Assets built for version ${config.version}`);
  }

  private async deployCode(config: DeploymentConfig): Promise<void> {
    // Simulate code deployment
    await this.delay(4000);
    console.log(`Code deployed from branch ${config.branch}`);
  }

  private async migrateDatabase(config: DeploymentConfig): Promise<void> {
    // Simulate database migration
    await this.delay(2000);
    console.log('Database migrations completed');
  }

  private async updateConfiguration(config: DeploymentConfig): Promise<void> {
    // Simulate configuration update
    await this.delay(1000);
    console.log(`Configuration updated for ${config.environment}`);
  }

  private async restartServices(config: DeploymentConfig): Promise<void> {
    // Simulate service restart
    await this.delay(3000);
    console.log('Services restarted successfully');
  }

  private async runHealthChecks(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) return;

    const healthChecks: HealthCheckResult[] = [];
    
    for (const endpoint of deployment.config.healthCheckEndpoints) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(endpoint, { 
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
        
        const responseTime = Date.now() - startTime;
        
        healthChecks.push({
          endpoint,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status,
          message: response.ok ? 'Service is healthy' : `HTTP ${response.status}`,
          timestamp: Date.now()
        });
      } catch (error) {
        healthChecks.push({
          endpoint,
          status: 'timeout',
          responseTime: Date.now() - startTime,
          message: `Health check failed: ${error}`,
          timestamp: Date.now()
        });
      }
    }
    
    deployment.healthChecks = healthChecks;
    
    const unhealthyChecks = healthChecks.filter(check => check.status !== 'healthy');
    if (unhealthyChecks.length > 0) {
      throw new Error(`${unhealthyChecks.length} health checks failed`);
    }
  }

  private async runSmokeTests(config: DeploymentConfig): Promise<void> {
    // Simulate smoke tests
    await this.delay(3000);
    
    const tests = [
      'Authentication flow',
      'API endpoints',
      'Database connectivity',
      'Cache functionality'
    ];
    
    for (const test of tests) {
      console.log(`✓ ${test}`);
      await this.delay(500);
    }
  }

  private async warmCaches(config: DeploymentConfig): Promise<void> {
    // Simulate cache warming
    await this.delay(2000);
    console.log('Application caches warmed');
  }

  private async runPostDeploymentValidation(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) return;

    // Run validation tests after deployment
    console.log('Running post-deployment validation...');
    await this.delay(2000);
  }

  async rollbackDeployment(deploymentId: string, targetVersion: string): Promise<string> {
    const originalDeployment = this.getDeploymentById(deploymentId);
    if (!originalDeployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const rollbackConfig: DeploymentConfig = {
      ...originalDeployment.config,
      version: targetVersion,
      rollbackVersion: originalDeployment.config.version,
      branch: 'rollback',
      buildId: `rollback-${Date.now()}`
    };

    const rollbackId = await this.startDeployment(rollbackConfig);
    
    // Mark original deployment as rolled back
    originalDeployment.status = 'rolled_back';
    
    return rollbackId;
  }

  generateRollbackPlan(deploymentId: string, targetVersion: string): RollbackPlan {
    const deployment = this.getDeploymentById(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    return {
      targetVersion,
      affectedServices: ['web-app', 'api', 'database'],
      estimatedDuration: 10 * 60 * 1000, // 10 minutes
      steps: this.generateDeploymentSteps({
        ...deployment.config,
        version: targetVersion
      }).slice(0, 5), // Simplified rollback steps
      dataBackupRequired: true,
      riskLevel: 'medium'
    };
  }

  private async sendDeploymentNotification(deployment: DeploymentStatus): Promise<void> {
    const config = deployment.config;
    const message = this.generateNotificationMessage(deployment);

    // Send Slack notification
    if (config.notifications.slack) {
      try {
        await fetch(config.notifications.slack, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            attachments: [{
              color: deployment.status === 'completed' ? 'good' : 'danger',
              fields: [
                { title: 'Environment', value: config.environment, short: true },
                { title: 'Version', value: config.version, short: true },
                { title: 'Duration', value: `${Math.round((deployment.duration || 0) / 1000)}s`, short: true },
                { title: 'Steps', value: `${deployment.completedSteps}/${deployment.totalSteps}`, short: true }
              ]
            }]
          })
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error);
      }
    }

    // Email notifications would be implemented here
    console.log('Deployment notification:', message);
  }

  private generateNotificationMessage(deployment: DeploymentStatus): string {
    const config = deployment.config;
    const status = deployment.status.toUpperCase();
    
    return `🚀 Deployment ${status}\n` +
           `Environment: ${config.environment}\n` +
           `Version: ${config.version}\n` +
           `Build ID: ${config.buildId}\n` +
           `Duration: ${Math.round((deployment.duration || 0) / 1000)}s\n` +
           `Steps: ${deployment.completedSteps}/${deployment.totalSteps}`;
  }

  private generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateDeploymentStatus(deploymentId: string, status: DeploymentStatus['status']): void {
    const deployment = this.activeDeployments.get(deploymentId);
    if (deployment) {
      deployment.status = status;
    }
  }

  private moveToHistory(deploymentId: string): void {
    const deployment = this.activeDeployments.get(deploymentId);
    if (deployment) {
      this.deploymentHistory.unshift(deployment);
      this.activeDeployments.delete(deploymentId);
      
      // Maintain history size
      if (this.deploymentHistory.length > this.maxHistorySize) {
        this.deploymentHistory = this.deploymentHistory.slice(0, this.maxHistorySize);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  getActiveDeployments(): DeploymentStatus[] {
    return Array.from(this.activeDeployments.values());
  }

  getDeploymentHistory(): DeploymentStatus[] {
    return [...this.deploymentHistory];
  }

  getDeploymentById(deploymentId: string): DeploymentStatus | undefined {
    return this.activeDeployments.get(deploymentId) || 
           this.deploymentHistory.find(d => d.id === deploymentId);
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    const deployment = this.activeDeployments.get(deploymentId);
    if (deployment && deployment.status === 'running') {
      deployment.status = 'cancelled';
      deployment.endTime = Date.now();
      deployment.duration = deployment.endTime - deployment.startTime;
      this.moveToHistory(deploymentId);
    }
  }

  getDeploymentMetrics(): {
    totalDeployments: number;
    successRate: number;
    averageDuration: number;
    recentDeployments: DeploymentStatus[];
  } {
    const allDeployments = [...this.deploymentHistory, ...this.activeDeployments.values()];
    const completed = allDeployments.filter(d => d.status === 'completed');
    const recent = allDeployments.slice(0, 10);
    
    return {
      totalDeployments: allDeployments.length,
      successRate: allDeployments.length > 0 ? (completed.length / allDeployments.length) * 100 : 0,
      averageDuration: completed.length > 0 ? 
        completed.reduce((sum, d) => sum + (d.duration || 0), 0) / completed.length : 0,
      recentDeployments: recent
    };
  }
}

// Singleton instance
export const deploymentAutomation = new DeploymentAutomationService();
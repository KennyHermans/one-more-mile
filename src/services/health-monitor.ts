import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo, logWarning } from "@/lib/error-handler";

export interface HealthStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
  responseTime?: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: HealthStatus[];
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface HealthIssue {
  id: string;
  type: 'error' | 'warning' | 'performance' | 'data_integrity';
  component: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: Date;
  auto_fixable: boolean;
  fix_attempted?: boolean;
  resolved?: boolean;
}

class HealthMonitorService {
  private static instance: HealthMonitorService;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((health: SystemHealth) => void)[] = [];

  static getInstance(): HealthMonitorService {
    if (!HealthMonitorService.instance) {
      HealthMonitorService.instance = new HealthMonitorService();
    }
    return HealthMonitorService.instance;
  }

  start(intervalMs: number = 60000) { // Default: 1 minute
    if (this.isRunning) return;
    
    this.isRunning = true;
    logInfo("Health monitoring started", { component: "HealthMonitor" });
    
    // Run initial check
    this.performHealthCheck();
    
    // Set up interval
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logInfo("Health monitoring stopped", { component: "HealthMonitor" });
  }

  subscribe(callback: (health: SystemHealth) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(health: SystemHealth) {
    this.listeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        logError(error as Error, { component: "HealthMonitor", action: "notifyListeners" });
      }
    });
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const components: HealthStatus[] = [];
    const issues: HealthIssue[] = [];

    try {
      // Check database connectivity
      const dbHealth = await this.checkDatabaseHealth();
      components.push(dbHealth);
      if (dbHealth.status !== 'healthy') {
        issues.push(...this.createIssuesFromHealth(dbHealth));
      }

      // Check real-time subscriptions
      const realtimeHealth = await this.checkRealtimeHealth();
      components.push(realtimeHealth);
      if (realtimeHealth.status !== 'healthy') {
        issues.push(...this.createIssuesFromHealth(realtimeHealth));
      }

      // Check authentication service
      const authHealth = await this.checkAuthHealth();
      components.push(authHealth);
      if (authHealth.status !== 'healthy') {
        issues.push(...this.createIssuesFromHealth(authHealth));
      }

      // Check edge functions
      const edgeFunctionsHealth = await this.checkEdgeFunctionsHealth();
      components.push(edgeFunctionsHealth);
      if (edgeFunctionsHealth.status !== 'healthy') {
        issues.push(...this.createIssuesFromHealth(edgeFunctionsHealth));
      }

      // Check storage service
      const storageHealth = await this.checkStorageHealth();
      components.push(storageHealth);
      if (storageHealth.status !== 'healthy') {
        issues.push(...this.createIssuesFromHealth(storageHealth));
      }

      // Check data integrity
      const dataIntegrityIssues = await this.checkDataIntegrity();
      issues.push(...dataIntegrityIssues);

      // Check performance metrics
      const performanceIssues = await this.checkPerformanceMetrics();
      issues.push(...performanceIssues);

      // Determine overall health
      const overall = this.calculateOverallHealth(components, issues);

      const systemHealth: SystemHealth = {
        overall,
        components,
        lastCheck: new Date(),
        issues
      };

      // Attempt auto-fixes for fixable issues
      await this.attemptAutoFixes(issues);

      // Log health status
      logInfo("Health check completed", { 
        component: "HealthMonitor", 
        metadata: { overall, issuesCount: issues.length, duration: Date.now() - startTime }
      });

      this.notifyListeners(systemHealth);
      return systemHealth;

    } catch (error) {
      logError(error as Error, { component: "HealthMonitor", action: "performHealthCheck" });
      
      const criticalHealth: SystemHealth = {
        overall: 'critical',
        components: [{
          component: 'system',
          status: 'critical',
          message: 'Health check failed',
          details: error,
          timestamp: new Date()
        }],
        lastCheck: new Date(),
        issues: [{
          id: `system-error-${Date.now()}`,
          type: 'error',
          component: 'system',
          title: 'Health Check Failure',
          description: 'Failed to perform system health check',
          severity: 'critical',
          detected_at: new Date(),
          auto_fixable: false
        }]
      };

      this.notifyListeners(criticalHealth);
      return criticalHealth;
    }
  }

  private async checkDatabaseHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          component: 'database',
          status: 'critical',
          message: 'Database connection failed',
          details: error,
          timestamp: new Date(),
          responseTime
        };
      }

      if (responseTime > 5000) {
        return {
          component: 'database',
          status: 'warning',
          message: 'Slow database response',
          details: { responseTime },
          timestamp: new Date(),
          responseTime
        };
      }

      return {
        component: 'database',
        status: 'healthy',
        message: 'Database connection healthy',
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        component: 'database',
        status: 'critical',
        message: 'Database check failed',
        details: error,
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkRealtimeHealth(): Promise<HealthStatus> {
    try {
      const testChannel = supabase.channel('health-check-test');
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testChannel.unsubscribe();
          resolve({
            component: 'realtime',
            status: 'warning',
            message: 'Realtime connection timeout',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          });
        }, 10000);

        testChannel.subscribe((status) => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          
          if (status === 'SUBSCRIBED') {
            testChannel.unsubscribe();
            resolve({
              component: 'realtime',
              status: 'healthy',
              message: 'Realtime subscriptions working',
              timestamp: new Date(),
              responseTime
            });
          } else {
            testChannel.unsubscribe();
            resolve({
              component: 'realtime',
              status: 'warning',
              message: `Realtime status: ${status}`,
              timestamp: new Date(),
              responseTime
            });
          }
        });
      });
    } catch (error) {
      return {
        component: 'realtime',
        status: 'critical',
        message: 'Realtime check failed',
        details: error,
        timestamp: new Date()
      };
    }
  }

  private async checkAuthHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const responseTime = Date.now() - startTime;

      return {
        component: 'authentication',
        status: 'healthy',
        message: 'Authentication service operational',
        details: { userLoggedIn: !!user },
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        component: 'authentication',
        status: 'warning',
        message: 'Authentication check inconclusive',
        details: error,
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkEdgeFunctionsHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test a simple edge function if available
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      const responseTime = Date.now() - startTime;

      if (error && error.message.includes('404')) {
        return {
          component: 'edge_functions',
          status: 'healthy',
          message: 'Edge functions infrastructure operational',
          details: { note: 'Test function not found but service accessible' },
          timestamp: new Date(),
          responseTime
        };
      }

      if (error) {
        return {
          component: 'edge_functions',
          status: 'warning',
          message: 'Edge functions partially operational',
          details: error,
          timestamp: new Date(),
          responseTime
        };
      }

      return {
        component: 'edge_functions',
        status: 'healthy',
        message: 'Edge functions fully operational',
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        component: 'edge_functions',
        status: 'warning',
        message: 'Edge functions status unknown',
        details: error,
        timestamp: new Date()
      };
    }
  }

  private async checkStorageHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test storage accessibility
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          component: 'storage',
          status: 'warning',
          message: 'Storage service issue',
          details: error,
          timestamp: new Date(),
          responseTime
        };
      }

      return {
        component: 'storage',
        status: 'healthy',
        message: `Storage service operational (${buckets?.length || 0} buckets)`,
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        component: 'storage',
        status: 'critical',
        message: 'Storage check failed',
        details: error,
        timestamp: new Date()
      };
    }
  }

  private async checkDataIntegrity(): Promise<HealthIssue[]> {
    const issues: HealthIssue[] = [];

    try {
      // Check for orphaned records
      const { data: tripsWithoutSenseis, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, sensei_id')
        .is('sensei_id', null)
        .eq('trip_status', 'approved');

      if (!tripsError && tripsWithoutSenseis && tripsWithoutSenseis.length > 0) {
        issues.push({
          id: `orphaned-trips-${Date.now()}`,
          type: 'data_integrity',
          component: 'database',
          title: 'Approved trips without senseis',
          description: `Found ${tripsWithoutSenseis.length} approved trips without assigned senseis`,
          severity: 'high',
          detected_at: new Date(),
          auto_fixable: false
        });
      }

      // Check for backup requirements
      const { data: tripsNeedingBackup, error: backupError } = await supabase
        .from('trips')
        .select('id, title, requires_backup_sensei, backup_sensei_id')
        .eq('requires_backup_sensei', true)
        .is('backup_sensei_id', null)
        .eq('trip_status', 'approved');

      if (!backupError && tripsNeedingBackup && tripsNeedingBackup.length > 0) {
        issues.push({
          id: `missing-backup-${Date.now()}`,
          type: 'data_integrity',
          component: 'trips',
          title: 'Trips missing backup senseis',
          description: `Found ${tripsNeedingBackup.length} trips requiring backup senseis`,
          severity: 'medium',
          detected_at: new Date(),
          auto_fixable: true
        });
      }

      // Check for payment inconsistencies
      const { data: pendingPayments, error: paymentError } = await supabase
        .from('trip_bookings')
        .select('id, payment_status, payment_deadline')
        .eq('payment_status', 'pending')
        .lt('payment_deadline', new Date().toISOString());

      if (!paymentError && pendingPayments && pendingPayments.length > 0) {
        issues.push({
          id: `overdue-payments-${Date.now()}`,
          type: 'data_integrity',
          component: 'payments',
          title: 'Overdue payment deadlines',
          description: `Found ${pendingPayments.length} bookings with overdue payment deadlines`,
          severity: 'high',
          detected_at: new Date(),
          auto_fixable: false
        });
      }

    } catch (error) {
      issues.push({
        id: `data-integrity-check-failed-${Date.now()}`,
        type: 'error',
        component: 'data_integrity',
        title: 'Data integrity check failed',
        description: 'Unable to complete data integrity checks',
        severity: 'medium',
        detected_at: new Date(),
        auto_fixable: false
      });
    }

    return issues;
  }

  private async checkPerformanceMetrics(): Promise<HealthIssue[]> {
    const issues: HealthIssue[] = [];

    try {
      // Check for slow-performing queries by testing common operations
      const operations = [
        { name: 'applications_query', query: () => supabase.from('applications').select('id').limit(1) },
        { name: 'trips_query', query: () => supabase.from('trips').select('id').limit(1) },
        { name: 'senseis_query', query: () => supabase.from('sensei_profiles').select('id').limit(1) }
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        try {
          await operation.query();
          const duration = Date.now() - startTime;
          
          if (duration > 3000) {
            issues.push({
              id: `slow-query-${operation.name}-${Date.now()}`,
              type: 'performance',
              component: 'database',
              title: 'Slow database query',
              description: `${operation.name} took ${duration}ms to complete`,
              severity: 'medium',
              detected_at: new Date(),
              auto_fixable: false
            });
          }
        } catch (error) {
          issues.push({
            id: `failed-query-${operation.name}-${Date.now()}`,
            type: 'error',
            component: 'database',
            title: 'Query execution failed',
            description: `Failed to execute ${operation.name}`,
            severity: 'high',
            detected_at: new Date(),
            auto_fixable: false
          });
        }
      }

    } catch (error) {
      issues.push({
        id: `performance-check-failed-${Date.now()}`,
        type: 'error',
        component: 'performance',
        title: 'Performance check failed',
        description: 'Unable to complete performance checks',
        severity: 'low',
        detected_at: new Date(),
        auto_fixable: false
      });
    }

    return issues;
  }

  private createIssuesFromHealth(health: HealthStatus): HealthIssue[] {
    if (health.status === 'healthy') return [];

    return [{
      id: `${health.component}-${Date.now()}`,
      type: health.status === 'critical' ? 'error' : 'warning',
      component: health.component,
      title: `${health.component} issue`,
      description: health.message,
      severity: health.status === 'critical' ? 'critical' : 'medium',
      detected_at: health.timestamp,
      auto_fixable: false
    }];
  }

  private calculateOverallHealth(components: HealthStatus[], issues: HealthIssue[]): 'healthy' | 'warning' | 'critical' {
    const criticalComponents = components.filter(c => c.status === 'critical');
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    
    if (criticalComponents.length > 0 || criticalIssues.length > 0) {
      return 'critical';
    }

    const warningComponents = components.filter(c => c.status === 'warning');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (warningComponents.length > 0 || highIssues.length > 0 || issues.length > 5) {
      return 'warning';
    }

    return 'healthy';
  }

  private async attemptAutoFixes(issues: HealthIssue[]): Promise<void> {
    const autoFixableIssues = issues.filter(issue => issue.auto_fixable && !issue.fix_attempted);

    for (const issue of autoFixableIssues) {
      try {
        await this.executeAutoFix(issue);
        issue.fix_attempted = true;
        logInfo(`Auto-fix attempted for issue: ${issue.title}`, { 
          component: "HealthMonitor", 
          metadata: { issueId: issue.id }
        });
      } catch (error) {
        logError(error as Error, { 
          component: "HealthMonitor", 
          action: "autoFix", 
          metadata: { issueId: issue.id }
        });
      }
    }
  }

  private async executeAutoFix(issue: HealthIssue): Promise<void> {
    switch (issue.id.split('-')[0]) {
      case 'missing':
        if (issue.component === 'trips') {
          // Trigger backup sensei assignment
          await this.triggerBackupAssignment();
        }
        break;
      default:
        logWarning(`No auto-fix available for issue type: ${issue.id}`, {
          component: "HealthMonitor"
        });
    }
  }

  private async triggerBackupAssignment(): Promise<void> {
    try {
      // This would trigger the existing backup assignment system
      const { error } = await supabase.functions.invoke('automated-backup-assignment');
      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to trigger backup assignment: ${error}`);
    }
  }
}

export const healthMonitor = HealthMonitorService.getInstance();
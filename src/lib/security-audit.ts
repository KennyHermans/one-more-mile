import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  event_type: 'login_attempt' | 'api_access' | 'admin_action' | 'suspicious_activity' | 'rate_limit_exceeded';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: number;
}

class SecurityAuditor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Add to local storage
    this.events.push(securityEvent);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', securityEvent);
      await this.sendCriticalAlert(securityEvent);
    }

    // Store in database for persistence (would need security_audit_log table)
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', securityEvent);
    }
  }

  private async sendCriticalAlert(event: SecurityEvent) {
    // In production, this would send to monitoring services
    console.warn('CRITICAL SECURITY ALERT:', {
      type: event.event_type,
      severity: event.severity,
      details: event.details,
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: SecurityEvent['event_type']): SecurityEvent[] {
    return this.events.filter(event => event.event_type === type);
  }

  getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  async getSecurityStats() {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => event.timestamp > last24Hours);

    return {
      total_events_24h: recentEvents.length,
      critical_events_24h: recentEvents.filter(e => e.severity === 'critical').length,
      high_events_24h: recentEvents.filter(e => e.severity === 'high').length,
      failed_logins_24h: recentEvents.filter(e => e.event_type === 'login_attempt' && e.details.success === false).length,
      rate_limit_violations_24h: recentEvents.filter(e => e.event_type === 'rate_limit_exceeded').length,
      suspicious_activities_24h: recentEvents.filter(e => e.event_type === 'suspicious_activity').length
    };
  }

  async checkSecurityThresholds() {
    const stats = await this.getSecurityStats();
    const alerts: string[] = [];

    if (stats.critical_events_24h > 5) {
      alerts.push(`High number of critical security events: ${stats.critical_events_24h}`);
    }

    if (stats.failed_logins_24h > 50) {
      alerts.push(`Excessive failed login attempts: ${stats.failed_logins_24h}`);
    }

    if (stats.rate_limit_violations_24h > 100) {
      alerts.push(`High rate limit violations: ${stats.rate_limit_violations_24h}`);
    }

    if (stats.suspicious_activities_24h > 10) {
      alerts.push(`Multiple suspicious activities detected: ${stats.suspicious_activities_24h}`);
    }

    return alerts;
  }
}

export const securityAuditor = new SecurityAuditor();

// Helper functions for common security events
export const logLoginAttempt = (userId: string | null, success: boolean, details: any = {}) => {
  securityAuditor.logSecurityEvent({
    event_type: 'login_attempt',
    user_id: userId || undefined,
    ip_address: details.ip_address,
    user_agent: details.user_agent,
    severity: success ? 'low' : 'medium',
    details: { success, ...details }
  });
};

export const logApiAccess = (endpoint: string, userId?: string, statusCode?: number) => {
  const severity = statusCode && statusCode >= 400 ? 'medium' : 'low';
  
  securityAuditor.logSecurityEvent({
    event_type: 'api_access',
    user_id: userId,
    endpoint,
    severity,
    details: { status_code: statusCode }
  });
};

export const logAdminAction = (action: string, userId: string, targetId?: string, details: any = {}) => {
  securityAuditor.logSecurityEvent({
    event_type: 'admin_action',
    user_id: userId,
    severity: 'medium',
    details: { action, target_id: targetId, ...details }
  });
};

export const logSuspiciousActivity = (activity: string, userId?: string, details: any = {}) => {
  securityAuditor.logSecurityEvent({
    event_type: 'suspicious_activity',
    user_id: userId,
    severity: 'high',
    details: { activity, ...details }
  });
};

export const logRateLimitExceeded = (endpoint: string, limit: number, userId?: string) => {
  securityAuditor.logSecurityEvent({
    event_type: 'rate_limit_exceeded',
    user_id: userId,
    endpoint,
    severity: 'medium',
    details: { limit, exceeded_at: new Date().toISOString() }
  });
};
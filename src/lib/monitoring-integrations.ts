// External monitoring service integrations for production

export interface MonitoringMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  environment: string;
}

export interface AlertConfig {
  channel: 'email' | 'sms' | 'slack' | 'webhook';
  enabled: boolean;
  threshold: 'warning' | 'critical';
  recipients?: string[];
  webhookUrl?: string;
}

class MonitoringIntegrations {
  private alertConfigs: Map<string, AlertConfig[]> = new Map();
  private metricBuffer: MonitoringMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultAlerts();
    this.startMetricBuffering();
  }

  private initializeDefaultAlerts() {
    // Performance alerts
    this.alertConfigs.set('performance', [
      {
        channel: 'email',
        enabled: true,
        threshold: 'warning',
        recipients: ['admin@example.com']
      },
      {
        channel: 'slack',
        enabled: true,
        threshold: 'critical',
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      }
    ]);

    // Security alerts
    this.alertConfigs.set('security', [
      {
        channel: 'email',
        enabled: true,
        threshold: 'warning',
        recipients: ['security@example.com']
      },
      {
        channel: 'sms',
        enabled: true,
        threshold: 'critical',
        recipients: ['+1234567890']
      }
    ]);

    // System health alerts
    this.alertConfigs.set('health', [
      {
        channel: 'slack',
        enabled: true,
        threshold: 'warning',
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      }
    ]);
  }

  private startMetricBuffering() {
    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000);
  }

  recordMetric(metric: MonitoringMetric) {
    this.metricBuffer.push(metric);
    
    // Flush immediately if buffer is full
    if (this.metricBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  private async flushMetrics() {
    if (this.metricBuffer.length === 0) return;

    const metrics = [...this.metricBuffer];
    this.metricBuffer = [];

    try {
      await Promise.all([
        this.sendToDataDog(metrics),
        this.sendToCustomEndpoint(metrics),
        this.logToConsole(metrics)
      ]);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Put metrics back in buffer for retry
      this.metricBuffer.unshift(...metrics);
    }
  }

  private async sendToDataDog(metrics: MonitoringMetric[]) {
    // DataDog integration
    try {
      const apiKey = process.env.DATADOG_API_KEY;
      if (!apiKey) return;

      const payload = {
        series: metrics.map(metric => ({
          metric: `onemoremiletravels.${metric.name}`,
          points: [[metric.timestamp / 1000, metric.value]],
          tags: Object.entries(metric.tags || {}).map(([key, value]) => `${key}:${value}`)
        }))
      };

      await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('DataDog integration error:', error);
    }
  }

  private async sendToCustomEndpoint(metrics: MonitoringMetric[]) {
    // Custom monitoring endpoint
    try {
      const endpoint = process.env.CUSTOM_MONITORING_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_TOKEN}`
        },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      console.error('Custom monitoring endpoint error:', error);
    }
  }

  private logToConsole(metrics: MonitoringMetric[]) {
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Monitoring Metrics');
      metrics.forEach(metric => {
        console.log(`${metric.name}: ${metric.value} (${new Date(metric.timestamp).toISOString()})`);
      });
      console.groupEnd();
    }
  }

  async sendAlert(type: string, severity: 'warning' | 'critical', message: string, details?: any) {
    const configs = this.alertConfigs.get(type) || [];
    
    for (const config of configs) {
      if (!config.enabled || config.threshold !== severity) continue;

      try {
        switch (config.channel) {
          case 'email':
            await this.sendEmailAlert(config, message, details);
            break;
          case 'sms':
            await this.sendSMSAlert(config, message);
            break;
          case 'slack':
            await this.sendSlackAlert(config, message, details, severity);
            break;
          case 'webhook':
            await this.sendWebhookAlert(config, message, details);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${config.channel} alert:`, error);
      }
    }
  }

  private async sendEmailAlert(config: AlertConfig, message: string, details?: any) {
    // Email integration (using Supabase Edge Function)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      await supabase.functions.invoke('send-alert-email', {
        body: {
          recipients: config.recipients,
          subject: `🚨 One More Mile Travels Alert`,
          message,
          details
        }
      });
    } catch (error) {
      console.error('Email alert error:', error);
    }
  }

  private async sendSMSAlert(config: AlertConfig, message: string) {
    // SMS integration (using Twilio or similar)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      await supabase.functions.invoke('send-alert-sms', {
        body: {
          recipients: config.recipients,
          message: `🚨 ALERT: ${message}`
        }
      });
    } catch (error) {
      console.error('SMS alert error:', error);
    }
  }

  private async sendSlackAlert(config: AlertConfig, message: string, details?: any, severity?: string) {
    if (!config.webhookUrl) return;

    try {
      const color = severity === 'critical' ? '#ff0000' : '#ffaa00';
      const emoji = severity === 'critical' ? '🚨' : '⚠️';
      
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} One More Mile Travels Alert`,
          attachments: [{
            color,
            fields: [
              {
                title: 'Alert Message',
                value: message,
                short: false
              },
              {
                title: 'Severity',
                value: severity?.toUpperCase(),
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              },
              ...(details ? [{
                title: 'Details',
                value: JSON.stringify(details, null, 2),
                short: false
              }] : [])
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Slack alert error:', error);
    }
  }

  private async sendWebhookAlert(config: AlertConfig, message: string, details?: any) {
    if (!config.webhookUrl) return;

    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          details,
          timestamp: new Date().toISOString(),
          source: 'onemoremiletravels'
        })
      });
    } catch (error) {
      console.error('Webhook alert error:', error);
    }
  }

  configureAlert(type: string, config: AlertConfig) {
    const existing = this.alertConfigs.get(type) || [];
    existing.push(config);
    this.alertConfigs.set(type, existing);
  }

  getAlertConfigs(type: string): AlertConfig[] {
    return this.alertConfigs.get(type) || [];
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Flush any remaining metrics
    this.flushMetrics();
  }
}

// Singleton instance
export const monitoringIntegrations = new MonitoringIntegrations();
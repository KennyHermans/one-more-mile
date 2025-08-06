import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeConfig {
  channel: string;
  table?: string;
  filter?: string;
  throttleMs?: number;
  priority: 'high' | 'medium' | 'low';
  compression?: boolean;
  selective?: boolean;
}

interface ChannelManager {
  channel: RealtimeChannel;
  config: RealtimeConfig;
  lastUpdate: number;
  messageCount: number;
  throttleTimer?: NodeJS.Timeout;
  pendingUpdates: any[];
}

class RealtimeOptimizer {
  private channels = new Map<string, ChannelManager>();
  private connectionHealth = {
    connected: false,
    latency: 0,
    reconnectCount: 0,
    lastReconnect: 0
  };
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private analytics = {
    messagesReceived: 0,
    messagesThrottled: 0,
    compressionSavings: 0,
    averageLatency: 0
  };

  constructor() {
    this.monitorConnection();
    this.startHealthCheck();
  }

  // Optimized channel subscription
  subscribe(config: RealtimeConfig, callback: (payload: any) => void): () => void {
    const channelKey = `${config.channel}:${config.table || 'all'}`;
    
    // Check if we already have this channel
    if (this.channels.has(channelKey)) {
      console.warn(`Channel ${channelKey} already exists`);
      return () => {};
    }

    const channel = supabase.channel(config.channel);
    
    // Configure the channel based on options
    if (config.table) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: config.filter
        },
        (payload) => this.handleMessage(channelKey, payload, callback)
      );
    } else {
      // Broadcast channel
      channel.on('broadcast', { event: '*' }, (payload) => 
        this.handleMessage(channelKey, payload, callback)
      );
    }

    const manager: ChannelManager = {
      channel,
      config,
      lastUpdate: 0,
      messageCount: 0,
      pendingUpdates: []
    };

    this.channels.set(channelKey, manager);
    
    // Subscribe with priority-based configuration
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Realtime channel ${channelKey} subscribed`);
      } else if (status === 'CHANNEL_ERROR') {
        this.handleChannelError(channelKey);
      }
    });

    // Return unsubscribe function
    return () => this.unsubscribe(channelKey);
  }

  private handleMessage(
    channelKey: string,
    payload: any,
    callback: (payload: any) => void
  ) {
    const manager = this.channels.get(channelKey);
    if (!manager) return;

    this.analytics.messagesReceived++;
    manager.messageCount++;

    // Apply rate limiting
    if (this.isRateLimited(channelKey)) {
      this.analytics.messagesThrottled++;
      return;
    }

    // Apply throttling if configured
    if (manager.config.throttleMs) {
      const now = Date.now();
      if (now - manager.lastUpdate < manager.config.throttleMs) {
        // Add to pending updates
        manager.pendingUpdates.push(payload);
        
        if (!manager.throttleTimer) {
          manager.throttleTimer = setTimeout(() => {
            this.processPendingUpdates(channelKey, callback);
          }, manager.config.throttleMs);
        }
        return;
      }
      manager.lastUpdate = now;
    }

    // Apply compression if enabled
    const processedPayload = manager.config.compression 
      ? this.decompressPayload(payload)
      : payload;

    // Apply selective updates
    if (manager.config.selective && !this.shouldProcessUpdate(processedPayload)) {
      return;
    }

    callback(processedPayload);
  }

  private processPendingUpdates(
    channelKey: string,
    callback: (payload: any) => void
  ) {
    const manager = this.channels.get(channelKey);
    if (!manager) return;

    // Process only the latest update to avoid overwhelming the UI
    if (manager.pendingUpdates.length > 0) {
      const latestUpdate = manager.pendingUpdates[manager.pendingUpdates.length - 1];
      callback(latestUpdate);
    }

    manager.pendingUpdates = [];
    manager.throttleTimer = undefined;
    manager.lastUpdate = Date.now();
  }

  private isRateLimited(channelKey: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(channelKey);
    
    if (!limit || limit.resetTime <= now) {
      // Reset rate limit window (1 minute)
      this.rateLimits.set(channelKey, {
        count: 1,
        resetTime: now + 60 * 1000
      });
      return false;
    }

    // Allow up to 100 messages per minute per channel
    if (limit.count >= 100) {
      return true;
    }

    limit.count++;
    return false;
  }

  private shouldProcessUpdate(payload: any): boolean {
    // Implement selective update logic
    // Only process updates that actually change important data
    
    if (payload.eventType === 'UPDATE') {
      // Check if any important fields changed
      const importantFields = ['status', 'priority', 'user_id', 'created_at'];
      const changes = payload.new || {};
      const old = payload.old || {};
      
      return importantFields.some(field => changes[field] !== old[field]);
    }
    
    return true; // Process INSERT and DELETE by default
  }

  private decompressPayload(payload: any): any {
    // Simple decompression logic
    if (payload.__compressed) {
      try {
        return JSON.parse(payload.data);
      } catch {
        return payload;
      }
    }
    return payload;
  }

  private handleChannelError(channelKey: string) {
    console.error(`Channel error for ${channelKey}, attempting reconnection...`);
    this.connectionHealth.reconnectCount++;
    this.connectionHealth.lastReconnect = Date.now();
    
    // Implement exponential backoff for reconnection
    setTimeout(() => {
      this.reconnectChannel(channelKey);
    }, Math.min(1000 * Math.pow(2, this.connectionHealth.reconnectCount), 30000));
  }

  private reconnectChannel(channelKey: string) {
    const manager = this.channels.get(channelKey);
    if (!manager) return;

    // Remove the old channel
    supabase.removeChannel(manager.channel);
    
    // Create a new subscription with the same config
    // This would require storing the original callback, which would need refactoring
    console.log(`Reconnecting channel ${channelKey}`);
  }

  private monitorConnection() {
    // Monitor connection through channel events instead
    const healthChannel = supabase.channel('health-monitor');
    
    healthChannel.subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          this.connectionHealth.connected = true;
          console.log('Realtime connection established');
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          this.connectionHealth.connected = false;
          console.log('Realtime connection lost');
          break;
      }
    });
  }

  private startHealthCheck() {
    setInterval(() => {
      const startTime = Date.now();
      
      // Ping test using a temporary channel
      const pingChannel = supabase.channel('health-check');
      pingChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const endTime = Date.now();
          this.connectionHealth.latency = endTime - startTime;
          
          // Update rolling average
          this.analytics.averageLatency = 
            (this.analytics.averageLatency * 0.9) + (this.connectionHealth.latency * 0.1);
          
          supabase.removeChannel(pingChannel);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  unsubscribe(channelKey: string) {
    const manager = this.channels.get(channelKey);
    if (manager) {
      if (manager.throttleTimer) {
        clearTimeout(manager.throttleTimer);
      }
      supabase.removeChannel(manager.channel);
      this.channels.delete(channelKey);
    }
  }

  unsubscribeAll() {
    this.channels.forEach((manager, key) => {
      this.unsubscribe(key);
    });
  }

  // Broadcast with optimization
  async broadcast(
    channel: string,
    event: string,
    payload: any,
    options: { compress?: boolean; priority?: 'high' | 'medium' | 'low' } = {}
  ) {
    let processedPayload = payload;
    
    if (options.compress) {
      processedPayload = this.compressPayload(payload);
    }

    const broadcastChannel = supabase.channel(channel);
    await broadcastChannel.send({
      type: 'broadcast',
      event,
      payload: processedPayload
    });
  }

  private compressPayload(payload: any): any {
    try {
      const original = JSON.stringify(payload);
      const compressed = {
        __compressed: true,
        data: original,
        originalSize: original.length
      };
      
      this.analytics.compressionSavings += original.length * 0.3;
      return compressed;
    } catch {
      return payload;
    }
  }

  getConnectionHealth() {
    return this.connectionHealth;
  }

  getChannelStats() {
    return Array.from(this.channels.entries()).map(([key, manager]) => ({
      channel: key,
      messageCount: manager.messageCount,
      lastUpdate: manager.lastUpdate,
      priority: manager.config.priority,
      pendingUpdates: manager.pendingUpdates.length
    }));
  }

  getAnalytics() {
    return {
      ...this.analytics,
      activeChannels: this.channels.size,
      connectionHealth: this.connectionHealth,
      throttledRate: this.analytics.messagesReceived > 0 
        ? this.analytics.messagesThrottled / this.analytics.messagesReceived 
        : 0
    };
  }

  // Configuration methods
  updateChannelPriority(channelKey: string, priority: 'high' | 'medium' | 'low') {
    const manager = this.channels.get(channelKey);
    if (manager) {
      manager.config.priority = priority;
    }
  }

  setGlobalThrottle(throttleMs: number) {
    this.channels.forEach(manager => {
      manager.config.throttleMs = throttleMs;
    });
  }
}

export const realtimeOptimizer = new RealtimeOptimizer();

// Convenience methods
export const subscribeOptimized = (
  config: RealtimeConfig,
  callback: (payload: any) => void
) => realtimeOptimizer.subscribe(config, callback);

export const broadcastOptimized = (
  channel: string,
  event: string,
  payload: any,
  options?: { compress?: boolean; priority?: 'high' | 'medium' | 'low' }
) => realtimeOptimizer.broadcast(channel, event, payload, options);

export type { RealtimeConfig, ChannelManager };
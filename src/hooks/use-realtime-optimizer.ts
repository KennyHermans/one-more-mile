import { useEffect, useCallback, useRef } from 'react';
import { realtimeOptimizer, subscribeOptimized, broadcastOptimized } from '@/lib/realtime-optimizer';
import type { RealtimeConfig } from '@/lib/realtime-optimizer';

export function useOptimizedRealtime<T>(
  config: RealtimeConfig,
  callback: (payload: T) => void,
  dependencies: any[] = []
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to optimized realtime
    const unsubscribe = subscribeOptimized(config, callback);
    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [config.channel, config.table, config.filter, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const broadcast = useCallback(async (
    event: string,
    payload: any,
    options?: { compress?: boolean; priority?: 'high' | 'medium' | 'low' }
  ) => {
    await broadcastOptimized(config.channel, event, payload, options);
  }, [config.channel]);

  return { broadcast };
}

export function useRealtimeHealth() {
  const getConnectionHealth = useCallback(() => {
    return realtimeOptimizer.getConnectionHealth();
  }, []);

  const getChannelStats = useCallback(() => {
    return realtimeOptimizer.getChannelStats();
  }, []);

  const getAnalytics = useCallback(() => {
    return realtimeOptimizer.getAnalytics();
  }, []);

  const updateChannelPriority = useCallback((
    channelKey: string,
    priority: 'high' | 'medium' | 'low'
  ) => {
    realtimeOptimizer.updateChannelPriority(channelKey, priority);
  }, []);

  const setGlobalThrottle = useCallback((throttleMs: number) => {
    realtimeOptimizer.setGlobalThrottle(throttleMs);
  }, []);

  return {
    getConnectionHealth,
    getChannelStats,
    getAnalytics,
    updateChannelPriority,
    setGlobalThrottle
  };
}

// Specialized hooks for common use cases
export function useOptimizedTableSubscription<T>(
  table: string,
  callback: (payload: T) => void,
  options: {
    filter?: string;
    throttleMs?: number;
    priority?: 'high' | 'medium' | 'low';
    selective?: boolean;
  } = {}
) {
  const config: RealtimeConfig = {
    channel: `table-${table}`,
    table,
    filter: options.filter,
    throttleMs: options.throttleMs || 1000,
    priority: options.priority || 'medium',
    selective: options.selective || true
  };

  return useOptimizedRealtime(config, callback, [table, options.filter]);
}

export function useOptimizedBroadcastChannel<T>(
  channel: string,
  callback: (payload: T) => void,
  options: {
    throttleMs?: number;
    priority?: 'high' | 'medium' | 'low';
    compression?: boolean;
  } = {}
) {
  const config: RealtimeConfig = {
    channel,
    throttleMs: options.throttleMs || 500,
    priority: options.priority || 'medium',
    compression: options.compression || false
  };

  return useOptimizedRealtime(config, callback, [channel]);
}
import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';
import { cacheManager } from '@/lib/cache-manager';
import { queryClient } from '@/lib/query-client';

// Hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  const [renderTime, setRenderTime] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setRenderTime(duration);
      
      performanceMonitor.recordMetric({
        name: `component-render-${componentName}`,
        value: duration,
        timestamp: Date.now(),
        metadata: { type: 'component-render' },
      });
    };
  }, [componentName]);

  return { renderTime };
}

// Hook for measuring async operations
export function useAsyncPerformance() {
  const measureAsync = useCallback(async <T>(
    name: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(name, asyncFunction);
  }, []);

  return { measureAsync };
}

// Hook for caching with performance tracking
export function usePerformantCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options?: { ttl?: number; tags?: string[] }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await performanceMonitor.measureAsyncFunction(
        `cache-fetch-${key}`,
        () => cacheManager.getOrSet(key, fetchFunction, options)
      );
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    cacheManager.delete(key);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refresh };
}

// Hook for query performance optimization
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: {
    staleTime?: number;
    gcTime?: number;
    enableOptimistic?: boolean;
  }
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);

  // Optimistic updates
  const updateOptimistic = useCallback((data: T) => {
    if (options?.enableOptimistic) {
      setOptimisticData(data);
      
      // Set optimistic data in query cache
      queryClient.setQueryData(queryKey, data);
      
      // Invalidate after a short delay to refetch real data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 100);
    }
  }, [queryKey, options?.enableOptimistic]);

  const prefetch = useCallback(() => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn: () => performanceMonitor.measureAsyncFunction(
        `query-${queryKey.join('-')}`,
        queryFn
      ),
      staleTime: options?.staleTime || 5 * 60 * 1000,
      gcTime: options?.gcTime || 10 * 60 * 1000,
    });
  }, [queryKey, queryFn, options]);

  return {
    optimisticData,
    updateOptimistic,
    prefetch,
  };
}

// Hook for performance budgets
export function usePerformanceBudget(budgets: Record<string, number>) {
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    const checkBudgets = () => {
      const summary = performanceMonitor.getPerformanceSummary();
      const newViolations: string[] = [];

      Object.entries(budgets).forEach(([metric, budget]) => {
        let currentValue = 0;

        switch (metric) {
          case 'averageResponseTime':
            currentValue = summary.summary.averageResponseTime;
            break;
          case 'webVitalsScore':
            currentValue = summary.summary.webVitalsScore;
            break;
          case 'slowOperations':
            currentValue = summary.summary.slowOperations;
            break;
        }

        if (currentValue > budget) {
          newViolations.push(`${metric}: ${currentValue} exceeds budget of ${budget}`);
        }
      });

      setViolations(newViolations);
    };

    // Check budgets periodically
    const interval = setInterval(checkBudgets, 30000); // Every 30 seconds
    checkBudgets(); // Initial check

    return () => clearInterval(interval);
  }, [budgets]);

  return { violations };
}

// Hook for real-time performance monitoring
export function useRealtimePerformance(interval: number = 5000) {
  const [metrics, setMetrics] = useState(performanceMonitor.getPerformanceSummary());

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getPerformanceSummary());
    };

    const intervalId = setInterval(updateMetrics, interval);
    return () => clearInterval(intervalId);
  }, [interval]);

  return metrics;
}
import { useState, useEffect, useCallback } from 'react';
import { advancedCache } from '@/lib/advanced-cache';
import type { CacheStrategy, CacheWarmupJob } from '@/lib/advanced-cache';

export function useAdvancedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  strategyName: string = 'default',
  options: {
    enabled?: boolean;
    refetchOnMount?: boolean;
    backgroundRefetch?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    enabled = true,
    refetchOnMount = true,
    backgroundRefetch = false
  } = options;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        // Skip cache and fetch fresh data
        const freshData = await fetcher();
        await advancedCache.set(key, freshData, strategyName);
        setData(freshData);
      } else {
        // Use cache with fallback to fetcher
        const cachedData = await advancedCache.getOrSet(key, fetcher, strategyName);
        setData(cachedData);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, strategyName, enabled]);

  const invalidate = useCallback(async () => {
    // This would require implementing cache invalidation by key
    console.log(`Invalidating cache for key: ${key}`);
    await fetchData(true);
  }, [key, fetchData]);

  const warmup = useCallback(async () => {
    if (!enabled) return;

    try {
      const warmupJob: CacheWarmupJob = {
        key,
        fetcher,
        priority: 'medium'
      };
      advancedCache.addWarmupJob(warmupJob);
      await advancedCache.warmupCache([key]);
    } catch (err) {
      console.warn('Cache warmup failed:', err);
    }
  }, [key, fetcher, enabled]);

  // Background refetch
  useEffect(() => {
    if (backgroundRefetch && data) {
      const interval = setInterval(async () => {
        try {
          const freshData = await fetcher();
          await advancedCache.set(key, freshData, strategyName);
          setData(freshData);
        } catch (err) {
          console.warn('Background refetch failed:', err);
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [backgroundRefetch, data, key, fetcher, strategyName]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
    warmup
  };
}

export function useCacheAnalytics() {
  const [analytics, setAnalytics] = useState(advancedCache.getAnalytics());

  const refreshAnalytics = useCallback(() => {
    setAnalytics(advancedCache.getAnalytics());
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshAnalytics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [refreshAnalytics]);

  return {
    analytics,
    refreshAnalytics,
    strategies: advancedCache.getStrategies()
  };
}

export function useCacheStrategy() {
  const addStrategy = useCallback((name: string, strategy: CacheStrategy) => {
    advancedCache.addStrategy(name, strategy);
  }, []);

  const addWarmupJob = useCallback((job: CacheWarmupJob) => {
    advancedCache.addWarmupJob(job);
  }, []);

  const warmupCache = useCallback(async (keys?: string[]) => {
    await advancedCache.warmupCache(keys);
  }, []);

  const invalidateByTags = useCallback(async (tags: string[]) => {
    await advancedCache.invalidateByTags(tags);
  }, []);

  return {
    addStrategy,
    addWarmupJob,
    warmupCache,
    invalidateByTags
  };
}
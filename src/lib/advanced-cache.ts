import { cacheManager } from './cache-manager';

interface CacheStrategy {
  name: string;
  ttl: number;
  maxSize?: number;
  prefetch?: boolean;
  compress?: boolean;
  tags?: string[];
}

interface CacheWarmupJob {
  key: string;
  fetcher: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  schedule?: string; // cron-like schedule
}

class AdvancedCacheManager {
  private strategies = new Map<string, CacheStrategy>();
  private warmupJobs = new Map<string, CacheWarmupJob>();
  private compressionEnabled = true;
  private analytics = {
    hits: 0,
    misses: 0,
    warmups: 0,
    compressionSavings: 0
  };

  constructor() {
    this.initializeStrategies();
    this.startWarmupScheduler();
  }

  private initializeStrategies() {
    // Static data - long TTL, high compression
    this.addStrategy('static', {
      name: 'static',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      prefetch: true,
      compress: true,
      tags: ['static']
    });

    // User-specific data - medium TTL
    this.addStrategy('user', {
      name: 'user',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 500,
      prefetch: false,
      compress: true,
      tags: ['user']
    });

    // Dynamic/realtime data - short TTL
    this.addStrategy('dynamic', {
      name: 'dynamic',
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
      prefetch: false,
      compress: false,
      tags: ['dynamic']
    });

    // Search results - medium TTL, high compression
    this.addStrategy('search', {
      name: 'search',
      ttl: 15 * 60 * 1000, // 15 minutes
      maxSize: 300,
      prefetch: false,
      compress: true,
      tags: ['search']
    });
  }

  addStrategy(name: string, strategy: CacheStrategy) {
    this.strategies.set(name, strategy);
  }

  async get<T>(key: string, strategyName: string = 'default'): Promise<T | null> {
    const strategy = this.strategies.get(strategyName);
    const data = await cacheManager.get<T>(key);
    
    if (data) {
      this.analytics.hits++;
      return this.decompress(data, strategy?.compress);
    }
    
    this.analytics.misses++;
    return null;
  }

  async set<T>(
    key: string, 
    data: T, 
    strategyName: string = 'default',
    customTtl?: number
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    const ttl = customTtl || strategy?.ttl || 30 * 60 * 1000;
    const compressed = this.compress(data, strategy?.compress);
    
    await cacheManager.set(key, compressed, { ttl, tags: strategy?.tags });
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    strategyName: string = 'default'
  ): Promise<T> {
    const cached = await this.get<T>(key, strategyName);
    if (cached) return cached;

    const data = await fetcher();
    await this.set(key, data, strategyName);
    return data;
  }

  // Background cache warming
  addWarmupJob(job: CacheWarmupJob) {
    this.warmupJobs.set(job.key, job);
  }

  async warmupCache(keys?: string[]) {
    const jobsToRun = keys 
      ? Array.from(this.warmupJobs.entries()).filter(([key]) => keys.includes(key))
      : Array.from(this.warmupJobs.entries());

    // Sort by priority
    jobsToRun.sort(([, a], [, b]) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const [key, job] of jobsToRun) {
      try {
        const data = await job.fetcher();
        await this.set(key, data, 'static');
        this.analytics.warmups++;
      } catch (error) {
        console.warn(`Cache warmup failed for ${key}:`, error);
      }
    }
  }

  private startWarmupScheduler() {
    // Run warmup every 5 minutes for high priority items
    setInterval(() => {
      const highPriorityJobs = Array.from(this.warmupJobs.entries())
        .filter(([, job]) => job.priority === 'high')
        .map(([key]) => key);
      
      if (highPriorityJobs.length > 0) {
        this.warmupCache(highPriorityJobs);
      }
    }, 5 * 60 * 1000);

    // Run full warmup every 30 minutes
    setInterval(() => {
      this.warmupCache();
    }, 30 * 60 * 1000);
  }

  private compress(data: any, shouldCompress?: boolean): any {
    if (!shouldCompress || !this.compressionEnabled) return data;
    
    try {
      const original = JSON.stringify(data);
      // Simple compression simulation - in reality you'd use a real compression library
      const compressed = {
        __compressed: true,
        data: original,
        originalSize: original.length
      };
      
      this.analytics.compressionSavings += original.length * 0.3; // Simulate 30% savings
      return compressed;
    } catch {
      return data;
    }
  }

  private decompress(data: any, shouldDecompress?: boolean): any {
    if (!shouldDecompress || !data?.__compressed) return data;
    
    try {
      return JSON.parse(data.data);
    } catch {
      return data;
    }
  }

  // Cache invalidation with webhooks
  async invalidateByPattern(pattern: string) {
    // Implementation would depend on your cache store
    console.log(`Invalidating cache pattern: ${pattern}`);
  }

  async invalidateByTags(tags: string[]) {
    await cacheManager.invalidateByTags(tags);
  }

  getAnalytics() {
    const total = this.analytics.hits + this.analytics.misses;
    return {
      ...this.analytics,
      hitRate: total > 0 ? this.analytics.hits / total : 0,
      totalRequests: total
    };
  }

  getStrategies() {
    return Array.from(this.strategies.values());
  }
}

export const advancedCache = new AdvancedCacheManager();

// Pre-configured cache warmup jobs
advancedCache.addWarmupJob({
  key: 'static:trips',
  fetcher: async () => {
    // This would typically fetch from your API
    return { trips: [] };
  },
  priority: 'high'
});

advancedCache.addWarmupJob({
  key: 'static:senseis',
  fetcher: async () => {
    return { senseis: [] };
  },
  priority: 'high'
});

advancedCache.addWarmupJob({
  key: 'static:locations',
  fetcher: async () => {
    return { locations: [] };
  },
  priority: 'medium'
});

export type { CacheStrategy, CacheWarmupJob };
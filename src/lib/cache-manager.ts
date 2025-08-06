// Application-level caching with smart invalidation

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tags: string[]; // For smart invalidation
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableLocalStorage: boolean;
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private accessTimes = new Map<string, number>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      enableLocalStorage: true,
      ...config,
    };

    // Load cache from localStorage on initialization
    if (this.config.enableLocalStorage) {
      this.loadFromLocalStorage();
    }

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  // Set cache entry
  set<T>(key: string, data: T, options: { ttl?: number; tags?: string[] } = {}): void {
    const ttl = options.ttl || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags: options.tags || [],
    };

    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());

    // Enforce cache size limit
    if (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }

    // Save to localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(key, entry);
    }
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.trackMiss();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.trackMiss();
      return null;
    }

    // Update access time
    this.accessTimes.set(key, Date.now());
    this.trackHit();
    
    return entry.data as T;
  }

  // Check if cache has key
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // Delete cache entry
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);
    
    if (this.config.enableLocalStorage) {
      localStorage.removeItem(`cache_${key}`);
    }
    
    return deleted;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    
    if (this.config.enableLocalStorage) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(key => localStorage.removeItem(key));
    }
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  // Get or set with callback
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    const data = await fetchFunction();
    
    // Cache the result
    this.set(key, data, options);
    
    return data;
  }

  // Prefetch data
  async prefetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    // Only prefetch if not already cached
    if (!this.has(key)) {
      try {
        const data = await fetchFunction();
        this.set(key, data, options);
      } catch (error) {
        console.warn(`Prefetch failed for key ${key}:`, error);
      }
    }
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  // Evict least recently used entries
  private evictLRU(): void {
    const entriesByAccess = Array.from(this.accessTimes.entries())
      .sort(([, a], [, b]) => a - b);
    
    // Remove oldest 10% of entries
    const entriesToRemove = Math.floor(this.cache.size * 0.1);
    
    for (let i = 0; i < entriesToRemove && i < entriesByAccess.length; i++) {
      const [key] = entriesByAccess[i];
      this.delete(key);
    }
  }

  // Save to localStorage
  private saveToLocalStorage(key: string, entry: CacheEntry): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Failed to save cache entry to localStorage:`, error);
    }
  }

  // Check if localStorage is available
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__cache_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Load from localStorage
  private loadFromLocalStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(storageKey => {
          try {
            const cacheKey = storageKey.replace('cache_', '');
            const entryStr = localStorage.getItem(storageKey);
            
            if (entryStr) {
              const entry: CacheEntry = JSON.parse(entryStr);
              
              // Check if entry is still valid
              if (Date.now() - entry.timestamp <= entry.ttl) {
                this.cache.set(cacheKey, entry);
                this.accessTimes.set(cacheKey, entry.timestamp);
              } else {
                localStorage.removeItem(storageKey);
              }
            }
          } catch (error) {
            console.warn(`Failed to load cache entry from localStorage:`, error);
            try {
              localStorage.removeItem(storageKey);
            } catch {
              // Ignore cleanup errors
            }
          }
        });
    } catch (error) {
      console.warn(`Failed to load cache from localStorage:`, error);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      entries: Array.from(this.cache.keys()),
    };
  }

  private hits = 0;
  private misses = 0;

  // Calculate cache hit rate (real implementation)
  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }

  // Track cache hits/misses
  private trackHit() {
    this.hits++;
  }

  private trackMiss() {
    this.misses++;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Specialized cache utilities
export const searchCache = {
  get: (query: string) => cacheManager.get(`search_${query}`),
  set: (query: string, results: any[]) => 
    cacheManager.set(`search_${query}`, results, { 
      ttl: 2 * 60 * 1000, // 2 minutes for search results
      tags: ['search'] 
    }),
  invalidate: () => cacheManager.invalidateByTags(['search']),
};

export const userCache = {
  get: (userId: string) => cacheManager.get(`user_${userId}`),
  set: (userId: string, userData: any) => 
    cacheManager.set(`user_${userId}`, userData, { 
      ttl: 10 * 60 * 1000, // 10 minutes for user data
      tags: ['user', userId] 
    }),
  invalidate: (userId?: string) => 
    userId ? cacheManager.invalidateByTags([userId]) : cacheManager.invalidateByTags(['user']),
};

export const staticDataCache = {
  get: (key: string) => cacheManager.get(`static_${key}`),
  set: (key: string, data: any) => 
    cacheManager.set(`static_${key}`, data, { 
      ttl: 30 * 60 * 1000, // 30 minutes for static data
      tags: ['static'] 
    }),
  invalidate: () => cacheManager.invalidateByTags(['static']),
};
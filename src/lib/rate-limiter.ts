interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (userId?: string, endpoint?: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private configs = new Map<string, RateLimitConfig>();

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  addConfig(name: string, config: RateLimitConfig) {
    this.configs.set(name, config);
  }

  async checkLimit(
    configName: string,
    userId?: string,
    endpoint?: string
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit config '${configName}' not found`);
    }

    const key = config.keyGenerator 
      ? config.keyGenerator(userId, endpoint)
      : `${configName}:${userId || 'anonymous'}:${endpoint || 'default'}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let entry = this.store.get(key);
    
    // Reset if window has expired
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    const info: RateLimitInfo = {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      reset: Math.ceil(entry.resetTime / 1000)
    };

    if (entry.count >= config.maxRequests) {
      info.retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, info };
    }

    entry.count++;
    this.store.set(key, entry);
    info.remaining = Math.max(0, config.maxRequests - entry.count);

    return { allowed: true, info };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalKeys: this.store.size,
      configs: Array.from(this.configs.keys())
    };
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Default configurations
rateLimiter.addConfig('api-general', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (userId) => `api-general:${userId || 'anonymous'}`
});

rateLimiter.addConfig('api-auth', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyGenerator: (userId) => `api-auth:${userId || 'anonymous'}`
});

rateLimiter.addConfig('api-upload', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  keyGenerator: (userId) => `api-upload:${userId || 'anonymous'}`
});

rateLimiter.addConfig('api-search', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  keyGenerator: (userId) => `api-search:${userId || 'anonymous'}`
});

// Client-side rate limit helper
export async function withRateLimit<T>(
  operation: () => Promise<T>,
  configName: string,
  userId?: string,
  endpoint?: string
): Promise<T> {
  const { allowed, info } = await rateLimiter.checkLimit(configName, userId, endpoint);
  
  if (!allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${info.retryAfter} seconds.`);
  }
  
  return operation();
}

export type { RateLimitConfig, RateLimitInfo };
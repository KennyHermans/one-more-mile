interface BatchRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  priority: number;
  timestamp: number;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

interface RequestQueue {
  requests: BatchRequest[];
  timer?: NodeJS.Timeout;
  processing: boolean;
}

class RequestOptimizer {
  private queues = new Map<string, RequestQueue>();
  private deduplicationCache = new Map<string, Promise<any>>();
  private batchConfig = {
    maxBatchSize: 10,
    batchTimeout: 100, // ms
    maxRetries: 3,
    retryDelay: 1000 // ms
  };
  private stats = {
    totalRequests: 0,
    batchedRequests: 0,
    deduplicatedRequests: 0,
    failedRequests: 0
  };

  constructor() {
    // Clean up old dedupe entries every 5 minutes
    setInterval(() => this.cleanupDeduplication(), 5 * 60 * 1000);
  }

  // Request batching
  async batchRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      const request: BatchRequest = {
        id: requestId,
        endpoint,
        method,
        data,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.addToBatch(endpoint, request);
      this.stats.totalRequests++;
    });
  }

  private addToBatch(endpoint: string, request: BatchRequest) {
    if (!this.queues.has(endpoint)) {
      this.queues.set(endpoint, {
        requests: [],
        processing: false
      });
    }

    const queue = this.queues.get(endpoint)!;
    queue.requests.push(request);
    
    // Sort by priority (higher first)
    queue.requests.sort((a, b) => b.priority - a.priority);

    // Process batch if it's full or start timer
    if (queue.requests.length >= this.batchConfig.maxBatchSize) {
      this.processBatch(endpoint);
    } else if (!queue.timer) {
      queue.timer = setTimeout(() => {
        this.processBatch(endpoint);
      }, this.batchConfig.batchTimeout);
    }
  }

  private async processBatch(endpoint: string) {
    const queue = this.queues.get(endpoint);
    if (!queue || queue.processing || queue.requests.length === 0) return;

    queue.processing = true;
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = undefined;
    }

    const requests = queue.requests.splice(0, this.batchConfig.maxBatchSize);
    this.stats.batchedRequests += requests.length;

    try {
      // For GET requests, we can batch them differently than POST/PUT/DELETE
      if (requests[0].method === 'GET') {
        await this.processBatchGET(requests);
      } else {
        await this.processBatchMutation(requests);
      }
    } catch (error) {
      requests.forEach(req => {
        req.reject(error);
        this.stats.failedRequests++;
      });
    }

    queue.processing = false;

    // Process remaining requests if any
    if (queue.requests.length > 0) {
      setTimeout(() => this.processBatch(endpoint), 10);
    }
  }

  private async processBatchGET(requests: BatchRequest[]) {
    // For GET requests, we can potentially combine them or process in parallel
    const promises = requests.map(req => this.executeRequest(req));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        requests[index].resolve(result.value);
      } else {
        requests[index].reject(result.reason);
        this.stats.failedRequests++;
      }
    });
  }

  private async processBatchMutation(requests: BatchRequest[]) {
    // For mutations, process sequentially to maintain order
    for (const request of requests) {
      try {
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
        this.stats.failedRequests++;
      }
    }
  }

  private async executeRequest(request: BatchRequest): Promise<any> {
    // This would integrate with your actual API client
    // For now, return a mock response
    await new Promise(resolve => setTimeout(resolve, 10));
    return { success: true, data: `Response for ${request.endpoint}` };
  }

  // Request deduplication
  async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5000
  ): Promise<T> {
    if (this.deduplicationCache.has(key)) {
      this.stats.deduplicatedRequests++;
      return this.deduplicationCache.get(key)!;
    }

    const promise = requestFn().finally(() => {
      // Remove from cache after TTL
      setTimeout(() => {
        this.deduplicationCache.delete(key);
      }, ttl);
    });

    this.deduplicationCache.set(key, promise);
    return promise;
  }

  // Request retry with exponential backoff
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.batchConfig.maxRetries,
    baseDelay: number = this.batchConfig.retryDelay
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.stats.failedRequests++;
    throw lastError;
  }

  // Combined optimization method
  async optimizedRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      priority?: number;
      deduplicate?: boolean;
      dedupeKey?: string;
      retry?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      data,
      priority = 0,
      deduplicate = true,
      dedupeKey,
      retry = true,
      maxRetries
    } = options;

    const requestFn = () => this.batchRequest<T>(endpoint, method, data, priority);

    if (deduplicate && method === 'GET') {
      const key = dedupeKey || `${endpoint}:${JSON.stringify(data)}`;
      return this.deduplicateRequest(key, requestFn);
    }

    if (retry) {
      return this.retryRequest(requestFn, maxRetries);
    }

    return requestFn();
  }

  private cleanupDeduplication() {
    // The cache will clean itself up via timeouts, but we can clear any remaining entries
    const now = Date.now();
    const cutoff = now - 5 * 60 * 1000; // 5 minutes ago
    
    // This is a simple cleanup - in a real implementation you'd track timestamps
    this.deduplicationCache.clear();
  }

  getStats() {
    return {
      ...this.stats,
      duplicateRate: this.stats.totalRequests > 0 
        ? this.stats.deduplicatedRequests / this.stats.totalRequests 
        : 0,
      batchingRate: this.stats.totalRequests > 0
        ? this.stats.batchedRequests / this.stats.totalRequests
        : 0,
      errorRate: this.stats.totalRequests > 0
        ? this.stats.failedRequests / this.stats.totalRequests
        : 0,
      activeQueues: this.queues.size,
      pendingRequests: Array.from(this.queues.values())
        .reduce((total, queue) => total + queue.requests.length, 0)
    };
  }

  // Configuration methods
  updateBatchConfig(config: Partial<typeof this.batchConfig>) {
    this.batchConfig = { ...this.batchConfig, ...config };
  }

  clearQueues() {
    this.queues.forEach(queue => {
      if (queue.timer) clearTimeout(queue.timer);
      queue.requests.forEach(req => 
        req.reject(new Error('Queue cleared'))
      );
    });
    this.queues.clear();
  }
}

export const requestOptimizer = new RequestOptimizer();

// Convenience methods
export const batchRequest = <T>(
  endpoint: string,
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any,
  priority?: number
) => requestOptimizer.batchRequest<T>(endpoint, method, data, priority);

export const deduplicateRequest = <T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl?: number
) => requestOptimizer.deduplicateRequest(key, requestFn, ttl);

export const retryRequest = <T>(
  requestFn: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number
) => requestOptimizer.retryRequest(requestFn, maxRetries, baseDelay);

export type { BatchRequest, RequestQueue };
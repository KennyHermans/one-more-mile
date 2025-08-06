import { useCallback } from 'react';
import { requestOptimizer, batchRequest, deduplicateRequest, retryRequest } from '@/lib/request-optimizer';
import { useToast } from '@/hooks/use-toast';

export function useRequestOptimizer() {
  const { toast } = useToast();

  const optimizedRequest = useCallback(async <T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      priority?: number;
      deduplicate?: boolean;
      dedupeKey?: string;
      retry?: boolean;
      maxRetries?: number;
      showErrorToast?: boolean;
    } = {}
  ): Promise<T> => {
    const {
      method = 'GET',
      data,
      priority = 0,
      deduplicate = true,
      dedupeKey,
      retry = true,
      maxRetries,
      showErrorToast = true
    } = options;

    try {
      return await requestOptimizer.optimizedRequest<T>(endpoint, {
        method,
        data,
        priority,
        deduplicate,
        dedupeKey,
        retry,
        maxRetries
      });
    } catch (error: any) {
      if (showErrorToast) {
        toast({
          title: "Request Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [toast]);

  const batchRequestWrapper = useCallback(async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    priority: number = 0
  ): Promise<T> => {
    try {
      return await batchRequest<T>(endpoint, method, data, priority);
    } catch (error: any) {
      toast({
        title: "Batch Request Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deduplicateRequestWrapper = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    try {
      return await deduplicateRequest(key, requestFn, ttl);
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const retryRequestWrapper = useCallback(async <T>(
    requestFn: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number
  ): Promise<T> => {
    try {
      return await retryRequest(requestFn, maxRetries, baseDelay);
    } catch (error: any) {
      toast({
        title: "Request Failed After Retries",
        description: error.message || "All retry attempts failed",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const getRequestStats = useCallback(() => {
    return requestOptimizer.getStats();
  }, []);

  const updateBatchConfig = useCallback((config: {
    maxBatchSize?: number;
    batchTimeout?: number;
    maxRetries?: number;
    retryDelay?: number;
  }) => {
    requestOptimizer.updateBatchConfig(config);
  }, []);

  return {
    optimizedRequest,
    batchRequest: batchRequestWrapper,
    deduplicateRequest: deduplicateRequestWrapper,
    retryRequest: retryRequestWrapper,
    getRequestStats,
    updateBatchConfig
  };
}

export function useRequestAnalytics() {
  const getStats = useCallback(() => {
    return requestOptimizer.getStats();
  }, []);

  return {
    getStats
  };
}
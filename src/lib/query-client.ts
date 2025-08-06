import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Enhanced QueryClient configuration with performance optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate pattern
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: false,
      
      // Performance optimizations
      refetchOnMount: 'always',
      retry: (failureCount, error: any) => {
        // Smart retry logic
        if (error?.status === 404) return false;
        if (error?.status >= 500) return failureCount < 2;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Global error handling for mutations
      onError: (error: any) => {
        console.error('Mutation error:', error);
        
        // User-friendly error messages
        const message = error?.message || 'An unexpected error occurred';
        toast({
          title: 'Operation Failed',
          description: message,
          variant: 'destructive',
        });
      },
      
      // Global success handling
      onSuccess: (data: any, variables: any, context: any) => {
        // Log successful mutations for monitoring
        console.log('Mutation success:', { data, variables, context });
      },
    },
  },
});

// Query invalidation utilities
export const invalidateQueries = {
  // Sensei-related queries
  senseis: () => queryClient.invalidateQueries({ queryKey: ['senseis'] }),
  senseiProfile: (id: string) => queryClient.invalidateQueries({ queryKey: ['sensei', id] }),
  senseiInsights: (id: string) => queryClient.invalidateQueries({ queryKey: ['sensei-insights', id] }),
  
  // Trip-related queries
  trips: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  trip: (id: string) => queryClient.invalidateQueries({ queryKey: ['trip', id] }),
  tripBookings: () => queryClient.invalidateQueries({ queryKey: ['trip-bookings'] }),
  
  // Admin-related queries
  adminAlerts: () => queryClient.invalidateQueries({ queryKey: ['admin-alerts'] }),
  adminStats: () => queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
  applications: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  
  // Customer-related queries
  customerProfile: () => queryClient.invalidateQueries({ queryKey: ['customer-profile'] }),
  customerBookings: () => queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }),
  wishlist: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  
  // Generic invalidation
  all: () => queryClient.invalidateQueries(),
};

// Prefetch utilities for performance
export const prefetchQueries = {
  senseis: () => queryClient.prefetchQuery({
    queryKey: ['senseis'],
    queryFn: async () => {
      // This would be replaced with actual API call
      return [];
    },
    staleTime: 5 * 60 * 1000,
  }),
  
  trips: () => queryClient.prefetchQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      // This would be replaced with actual API call
      return [];
    },
    staleTime: 3 * 60 * 1000,
  }),
};

// Performance monitoring for queries
export const queryPerformance = {
  measureQuery: (queryKey: string[], fn: () => Promise<any>) => {
    const start = performance.now();
    
    return fn().finally(() => {
      const duration = performance.now() - start;
      console.log(`Query ${queryKey.join('-')} took ${duration.toFixed(2)}ms`);
      
      // Track slow queries
      if (duration > 2000) {
        console.warn(`Slow query detected: ${queryKey.join('-')} (${duration.toFixed(2)}ms)`);
      }
    });
  },
};
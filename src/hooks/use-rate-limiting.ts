import { useState, useCallback } from 'react';
import { rateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function useRateLimit() {
  const [isLimited, setIsLimited] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const { toast } = useToast();

  const checkRateLimit = useCallback(async (
    configName: string,
    endpoint?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { allowed, info } = await rateLimiter.checkLimit(configName, userId, endpoint);
      
      setIsLimited(!allowed);
      setRemainingRequests(info.remaining);
      setResetTime(info.reset);

      if (!allowed && info.retryAfter) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Please wait ${info.retryAfter} seconds before trying again.`,
          variant: "destructive",
        });
      }

      return { allowed, info };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true, info: { limit: 0, remaining: 0, reset: 0 } };
    }
  }, [toast]);

  const withRateLimitWrapper = useCallback(async <T>(
    operation: () => Promise<T>,
    configName: string,
    endpoint?: string
  ): Promise<T> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      return await withRateLimit(operation, configName, userId, endpoint);
    } catch (error: any) {
      if (error.message.includes('Rate limit exceeded')) {
        setIsLimited(true);
        toast({
          title: "Too Many Requests",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [toast]);

  const getRateLimitStats = useCallback(() => {
    return rateLimiter.getStats();
  }, []);

  return {
    isLimited,
    remainingRequests,
    resetTime,
    checkRateLimit,
    withRateLimit: withRateLimitWrapper,
    getRateLimitStats
  };
}
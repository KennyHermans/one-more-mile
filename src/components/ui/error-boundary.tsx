import { useState, useRef, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
  onError?: (error: Error) => void;
}

const DefaultErrorFallback = ({ error, retry }: { error?: Error; retry?: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/5">
    <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
    <p className="text-sm text-muted-foreground mb-4">
      {error?.message || 'An unexpected error occurred'}
    </p>
    {retry && (
      <button 
        onClick={retry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Try again
      </button>
    )}
  </div>
);

export const ErrorBoundary = ({ 
  children, 
  fallback: Fallback = DefaultErrorFallback,
  onError 
}: ErrorBoundaryProps) => {
  const [state, setState] = useState<ErrorBoundaryState>({ hasError: false });

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setState({ hasError: true, error: new Error(error.message) });
      logError(new Error(error.message), {
        component: 'ErrorBoundary',
        action: 'globalErrorHandler'
      });
      onError?.(new Error(error.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setState({ hasError: true, error: new Error(event.reason) });
      logError(new Error(event.reason), {
        component: 'ErrorBoundary',
        action: 'unhandledPromise'
      });
      onError?.(new Error(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  const retry = () => {
    setState({ hasError: false, error: undefined });
  };

  if (state.hasError) {
    return <Fallback error={state.error} retry={retry} />;
  }

  return <>{children}</>;
};

// Enhanced real-time subscription manager
export class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 3;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  subscribe(
    channelName: string,
    config: {
      table: string;
      event?: string;
      schema?: string;
      filter?: string;
      onPayload?: (payload: any) => void;
    }
  ): () => void {
    try {
      // Clean up existing channel
      this.unsubscribe(channelName);

      const channel = supabase.channel(channelName);
      
      let changeOptions: any = {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table
      };

      if (config.filter) {
        changeOptions.filter = config.filter;
      }

      channel.on('postgres_changes', changeOptions, (payload) => {
        try {
          config.onPayload?.(payload);
          // Reset reconnect attempts on successful message
          this.reconnectAttempts.set(channelName, 0);
        } catch (error) {
          logError(error as Error, {
            component: 'RealtimeManager',
            action: 'onPayload',
            metadata: { channelName, table: config.table }
          });
        }
      });

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          const attempts = this.reconnectAttempts.get(channelName) || 0;
          if (attempts < this.maxReconnectAttempts) {
            this.reconnectAttempts.set(channelName, attempts + 1);
            setTimeout(() => {
              this.subscribe(channelName, config);
            }, Math.pow(2, attempts) * 1000); // Exponential backoff
          } else {
            logError(new Error('Max reconnection attempts reached'), {
              component: 'RealtimeManager',
              action: 'subscribe',
              metadata: { channelName, attempts }
            });
          }
        }
      });

      this.channels.set(channelName, channel);

      return () => this.unsubscribe(channelName);

    } catch (error) {
      logError(error as Error, {
        component: 'RealtimeManager',
        action: 'subscribe',
        metadata: { channelName }
      });
      return () => {};
    }
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        supabase.removeChannel(channel);
        this.channels.delete(channelName);
        this.reconnectAttempts.delete(channelName);
      } catch (error) {
        logError(error as Error, {
          component: 'RealtimeManager',
          action: 'unsubscribe',
          metadata: { channelName }
        });
      }
    }
  }

  cleanup(): void {
    for (const [channelName] of this.channels) {
      this.unsubscribe(channelName);
    }
  }
}

// Hook for consistent real-time subscriptions
export const useRealtimeSubscription = (
  channelName: string,
  config: {
    table: string;
    event?: string;
    schema?: string;
    filter?: string;
    onPayload?: (payload: any) => void;
    enabled?: boolean;
  }
) => {
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = RealtimeManager.getInstance();
    }
  }, []);

  useEffect(() => {
    if (!managerRef.current || !config.enabled) return;

    const unsubscribe = managerRef.current.subscribe(channelName, config);
    return unsubscribe;
  }, [channelName, config.table, config.event, config.schema, config.filter, config.enabled]);

  return null;
};
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logError } from '@/lib/error-handler';

interface UseRealtimeSubscriptionOptions {
  channelName: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  onPayload?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export const useRealtimeSubscription = ({
  channelName,
  table,
  event = '*',
  schema = 'public',
  filter,
  onPayload
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Clean up any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      const channel = supabase.channel(channelName);
      
      let changeOptions: any = {
        event,
        schema,
        table
      };

      if (filter) {
        changeOptions.filter = filter;
      }

      channel.on('postgres_changes', changeOptions, (payload) => {
        try {
          onPayload?.(payload);
        } catch (error) {
          logError(error as Error, {
            component: 'useRealtimeSubscription',
            action: 'onPayload',
            metadata: { channelName, table, event }
          });
        }
      });

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          logError(new Error('Realtime channel error'), {
            component: 'useRealtimeSubscription',
            action: 'subscribe',
            metadata: { channelName, table, status }
          });
        }
      });

      channelRef.current = channel;

    } catch (error) {
      logError(error as Error, {
        component: 'useRealtimeSubscription',
        action: 'setup',
        metadata: { channelName, table }
      });
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          logError(error as Error, {
            component: 'useRealtimeSubscription',
            action: 'cleanup',
            metadata: { channelName }
          });
        }
        channelRef.current = null;
      }
    };
  }, [channelName, table, event, schema, filter]);

  return channelRef.current;
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
}

export const useRealtimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  const sendNotification = async (userId: string, notification: NotificationData) => {
    try {
      const { error } = await supabase
        .from('realtime_notifications')
        .insert({
          user_id: userId,
          notification_type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }
  };

  const sendPayoutNotification = async (senseiUserId: string, payoutType: string, amount: number) => {
    const typeEmoji = {
      advance: '🚀',
      day1: '📅', 
      final: '✅'
    };

    await sendNotification(senseiUserId, {
      type: 'payout',
      title: `${typeEmoji[payoutType as keyof typeof typeEmoji]} ${payoutType} Payout Processed`,
      message: `Your ${payoutType} payout of €${amount.toFixed(2)} has been processed and is on its way to your account.`,
      data: { payoutType, amount }
    });
  };

  const sendTripNotification = async (userId: string, tripTitle: string, message: string) => {
    await sendNotification(userId, {
      type: 'trip',
      title: `Trip Update: ${tripTitle}`,
      message,
      data: { tripTitle }
    });
  };

  const sendSystemNotification = async (userId: string, title: string, message: string) => {
    await sendNotification(userId, {
      type: 'system',
      title,
      message,
    });
  };

  // Connect to real-time notifications
  useEffect(() => {
    const connectToNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const notification = payload.new;
            
            // Show toast notification
            toast(notification.title, {
              description: notification.message,
            });

            // Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ['realtime-notifications'] });
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
        setIsConnected(false);
      };
    };

    connectToNotifications();
  }, [queryClient]);

  return {
    isConnected,
    sendNotification,
    sendPayoutNotification,
    sendTripNotification,
    sendSystemNotification,
  };
};
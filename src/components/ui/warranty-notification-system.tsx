import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CreditCard, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WarrantyNotification {
  id: string;
  sensei_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export const WarrantyNotificationSystem = () => {
  const { data: notifications, refetch } = useQuery({
    queryKey: ['warranty-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_warranty_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as WarrantyNotification[];
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('sensei_warranty_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'setup_required':
        return <CreditCard className="h-4 w-4" />;
      case 'charge_processed':
        return <AlertTriangle className="h-4 w-4" />;
      case 'setup_complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'charge_failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'setup_required':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'charge_processed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'setup_complete':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'charge_failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Warranty Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications?.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${getNotificationColor(notification.type)} ${
                notification.is_read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{notification.title}</div>
                    <div className="text-sm mt-1">{notification.message}</div>
                    <div className="text-xs mt-2 opacity-75">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {!notification.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {!notifications?.length && (
            <div className="text-center py-8 text-muted-foreground">
              No warranty notifications
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Clock, 
  MapPin, 
  MessageSquare,
  AlertTriangle,
  Info,
  Star,
  Calendar,
  CreditCard,
  User,
  Settings
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'trip_update' | 'payment' | 'message' | 'review' | 'booking';
  is_read: boolean;
  created_at: string;
  related_trip_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationPreferences {
  trip_updates: boolean;
  payment_reminders: boolean;
  messages: boolean;
  reviews: boolean;
  marketing: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

interface SmartNotificationsProps {
  userId: string;
  className?: string;
}

export function SmartNotifications({ userId, className }: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    trip_updates: true,
    payment_reminders: true,
    messages: true,
    reviews: true,
    marketing: false,
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();
    loadPreferences();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        type: item.type as 'general' | 'trip_update' | 'payment' | 'message' | 'review' | 'booking',
        priority: (item as any).priority as 'low' | 'medium' | 'high' | 'urgent' | undefined
      }));

      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem(`notification_preferences_${userId}`);
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(newPreferences));
    
    toast({
      title: "Success",
      description: "Notification preferences updated",
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string, priority?: string) => {
    if (priority === 'urgent') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    
    switch (type) {
      case 'trip_update':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'review':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'booking':
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority || priority === 'low') return null;
    
    const variants = {
      medium: 'secondary',
      high: 'destructive',
      urgent: 'destructive'
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority}</Badge>;
  };

  const filteredNotifications = (filter: string) => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'trip':
        return notifications.filter(n => ['trip_update', 'booking'].includes(n.type));
      case 'payment':
        return notifications.filter(n => n.type === 'payment');
      case 'messages':
        return notifications.filter(n => n.type === 'message');
      default:
        return notifications;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Stay updated with your trip bookings, payments, and messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="trip">Trips</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {['all', 'unread', 'trip', 'payment', 'messages'].map((filter) => (
            <TabsContent key={filter} value={filter}>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredNotifications(filter).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BellOff className="h-8 w-8 mx-auto mb-2" />
                      <p>No notifications in this category</p>
                    </div>
                  ) : (
                    filteredNotifications(filter).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          notification.is_read 
                            ? 'bg-background' 
                            : 'bg-muted/50 border-primary/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getNotificationIcon(notification.type, notification.priority)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">
                                  {notification.title}
                                </h4>
                                {getPriorityBadge(notification.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(notification.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Notification Preferences
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(preferences).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm capitalize">
                  {key.replace(/_/g, ' ')}
                </Label>
                <Switch
                  id={key}
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, [key]: checked })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
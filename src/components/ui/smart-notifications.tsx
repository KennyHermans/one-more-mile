import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellRing, 
  MessageSquare, 
  Calendar, 
  CreditCard,
  MapPin,
  Users,
  TrendingUp,
  Settings,
  Clock,
  Zap,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileManagement } from '@/hooks/use-profile-management';
import { toast } from '@/hooks/use-toast';

interface SmartNotification {
  id: string;
  type: 'urgent' | 'important' | 'info' | 'promotional';
  category: 'booking' | 'payment' | 'message' | 'system' | 'recommendation';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: number;
  actionable: boolean;
  aiInsight?: string;
  relatedData?: any;
}

interface NotificationSettings {
  bookingUpdates: boolean;
  paymentReminders: boolean;
  messageAlerts: boolean;
  systemNotifications: boolean;
  recommendations: boolean;
  smartInsights: boolean;
  realTimeAlerts: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

export const SmartNotifications = () => {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    bookingUpdates: true,
    paymentReminders: true,
    messageAlerts: true,
    systemNotifications: false,
    recommendations: true,
    smartInsights: true,
    realTimeAlerts: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useProfileManagement();

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadSettings();
      setupRealTimeSubscription();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      if (!user) return;

      const { data: notifications, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedNotifications: SmartNotification[] = (notifications || []).map(notif => ({
        id: notif.id,
        type: notif.type === 'urgent' ? 'urgent' : 
              notif.type === 'important' ? 'important' : 
              notif.type === 'promotional' ? 'promotional' : 'info',
        category: notif.type as any,
        title: notif.title,
        message: notif.message,
        timestamp: new Date(notif.created_at),
        read: notif.is_read,
        priority: notif.type === 'urgent' ? 95 : 
                 notif.type === 'important' ? 85 : 
                 notif.type === 'promotional' ? 60 : 70,
        actionable: true,
        aiInsight: undefined,
        relatedData: { tripId: notif.related_trip_id }
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      toast({
        title: "Error loading notifications",
        description: "Failed to fetch notifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    // Settings could be stored in user preferences or separate table
    // For now using localStorage as fallback
    const stored = localStorage.getItem(`notification-settings-${user?.id}`);
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    // Save to localStorage for now
    localStorage.setItem(`notification-settings-${user?.id}`, JSON.stringify(newSettings));
    toast({
      title: 'Settings Saved',
      description: 'Your notification preferences have been updated.',
    });
  };

  const setupRealTimeSubscription = () => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          // Handle real-time notification updates
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (category: string) => {
    switch (category) {
      case 'booking': return <Calendar className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'recommendation': return <Brain className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'urgent': return 'destructive';
      case 'important': return 'default';
      case 'info': return 'secondary';
      case 'promotional': return 'outline';
      default: return 'secondary';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <BellRing className="h-6 w-6" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div>
                <CardTitle>Smart Notifications</CardTitle>
                <CardDescription>AI-powered notifications and insights</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getTypeVariant(notification.type)} className="text-xs">
                          {notification.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {notification.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      
                      {notification.aiInsight && (
                        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Zap className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">AI Insight</span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400">{notification.aiInsight}</p>
                        </div>
                      )}
                      
                      {notification.actionable && (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Take Action
                        </Button>
                      )}
                    </div>
                    
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Customize your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'bookingUpdates', label: 'Booking Updates', desc: 'Trip confirmations and changes' },
              { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Due dates and receipts' },
              { key: 'messageAlerts', label: 'Message Alerts', desc: 'New messages from senseis' },
              { key: 'systemNotifications', label: 'System Notifications', desc: 'Platform updates and maintenance' },
              { key: 'recommendations', label: 'Smart Recommendations', desc: 'AI-powered trip suggestions' },
              { key: 'smartInsights', label: 'Smart Insights', desc: 'Personalized tips and analytics' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={settings[key as keyof NotificationSettings] as boolean}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, [key]: checked };
                    saveSettings(newSettings);
                  }}
                />
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Real-time Alerts</Label>
              <p className="text-xs text-muted-foreground">Instant notifications for urgent matters</p>
            </div>
            <Switch
              checked={settings.realTimeAlerts}
              onCheckedChange={(checked) => {
                const newSettings = { ...settings, realTimeAlerts: checked };
                saveSettings(newSettings);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
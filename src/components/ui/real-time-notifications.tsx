import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Bell, X, Check, AlertTriangle, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface RealTimeNotificationsProps {
  userId?: string;
  onNotificationCount?: (count: number) => void;
}

export function RealTimeNotifications({ userId, onNotificationCount }: RealTimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const { toast: useToastHook } = useToast();

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();
  }, [userId]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    onNotificationCount?.(count);
  }, [notifications, onNotificationCount]);

  const fetchNotifications = async () => {
    try {
      // For admin users, fetch admin alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (alertsError) throw alertsError;

      const formattedNotifications: Notification[] = (alertsData || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        read: false,
        created_at: alert.created_at,
        metadata: {
          ...(typeof alert.metadata === 'object' && alert.metadata !== null ? alert.metadata : {}),
          trip_id: alert.trip_id,
          sensei_id: alert.sensei_id
        }
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_alerts'
        },
        (payload) => {
          // New alert received
          const newAlert = payload.new;
          
          const notification: Notification = {
            id: newAlert.id,
            type: newAlert.alert_type,
            title: newAlert.title,
            message: newAlert.message,
            priority: newAlert.priority,
            read: false,
            created_at: newAlert.created_at,
            metadata: {
              ...(typeof newAlert.metadata === 'object' && newAlert.metadata !== null ? newAlert.metadata : {}),
              trip_id: newAlert.trip_id,
              sensei_id: newAlert.sensei_id
            }
          };

          setNotifications(prev => [notification, ...prev]);
          
          // Show toast notification
          showNotificationToast(notification);
          
          // Browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_alerts'
        },
        (payload) => {
          // Alert updated
          const updatedAlert = payload.new;
          
          if (updatedAlert.is_resolved) {
            setNotifications(prev => prev.filter(n => n.id !== updatedAlert.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'backup_sensei_requests'
        },
        (payload) => {
          // New backup request
          const request = payload.new;
          
          useToastHook({
            title: "New Backup Request",
            description: `Backup sensei request sent for trip ${request.trip_id}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const showNotificationToast = (notification: Notification) => {
    const variant = notification.priority === 'critical' ? 'destructive' : 'default';
    
    toast(notification.title, {
      description: notification.message,
      action: {
        label: "View",
        onClick: () => setShowPanel(true)
      }
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('admin_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const notificationIds = notifications.map(n => n.id);
      
      await supabase
        .from('admin_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .in('id', notificationIds);

      setNotifications([]);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium': return <Bell className="h-4 w-4 text-warning" />;
      default: return <Bell className="h-4 w-4 text-info" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {showPanel && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No new notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 border-b hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getPriorityIcon(notification.priority)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                            <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                              {notification.priority}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="flex-shrink-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
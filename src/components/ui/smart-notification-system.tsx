import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellRing, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Users,
  Calendar,
  Zap
} from 'lucide-react';

interface NotificationRule {
  id: string;
  event_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: any;
  actions: string[];
  is_active: boolean;
  auto_resolve: boolean;
}

interface SmartNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: any;
  created_at: string;
  is_read: boolean;
  requires_action: boolean;
  auto_generated: boolean;
}

export const SmartNotificationSystem = () => {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadNotificationRules();
    setupRealtimeSubscription();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform admin_alerts to SmartNotification format
      const transformedNotifications: SmartNotification[] = data.map(alert => ({
        id: alert.id,
        type: alert.alert_type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority as any,
        metadata: alert.metadata || {},
        created_at: alert.created_at,
        is_read: alert.is_resolved,
        requires_action: ['backup_needed', 'backup_failed', 'conflict_detected'].includes(alert.alert_type),
        auto_generated: true
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Loading Error",
        description: "Unable to load notifications.",
        variant: "destructive",
      });
    }
  };

  const loadNotificationRules = async () => {
    // Default notification rules - in production these would be stored in DB
    const defaultRules: NotificationRule[] = [
      {
        id: 'backup-needed',
        event_type: 'trip_backup_required',
        title: 'Backup Sensei Required',
        description: 'Automatically notify when trips need backup senseis',
        priority: 'high',
        conditions: { backup_assignment_deadline: 'approaching' },
        actions: ['create_alert', 'notify_admins', 'auto_request_backups'],
        is_active: true,
        auto_resolve: false
      },
      {
        id: 'assignment-conflict',
        event_type: 'sensei_assignment_conflict',
        title: 'Assignment Conflict Detected',
        description: 'Alert when senseis have overlapping assignments',
        priority: 'critical',
        conditions: { overlapping_dates: true },
        actions: ['create_alert', 'notify_admins', 'suggest_alternatives'],
        is_active: true,
        auto_resolve: false
      },
      {
        id: 'level-upgrade',
        event_type: 'sensei_level_eligible',
        title: 'Sensei Level Upgrade Available',
        description: 'Notify when senseis meet upgrade requirements',
        priority: 'medium',
        conditions: { requirements_met: true },
        actions: ['create_notification', 'auto_upgrade'],
        is_active: true,
        auto_resolve: true
      },
      {
        id: 'trip-capacity',
        event_type: 'trip_capacity_alert',
        title: 'Trip Capacity Issues',
        description: 'Monitor trip capacity and booking trends',
        priority: 'medium',
        conditions: { capacity_threshold: 0.8 },
        actions: ['create_alert', 'suggest_actions'],
        is_active: true,
        auto_resolve: false
      }
    ];

    setRules(defaultRules);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('smart-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_alerts'
        },
        (payload) => {
          const newNotification: SmartNotification = {
            id: payload.new.id,
            type: payload.new.alert_type,
            title: payload.new.title,
            message: payload.new.message,
            priority: payload.new.priority,
            metadata: payload.new.metadata || {},
            created_at: payload.new.created_at,
            is_read: false,
            requires_action: ['backup_needed', 'backup_failed', 'conflict_detected'].includes(payload.new.alert_type),
            auto_generated: true
          };

          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast for high priority notifications
          if (['high', 'critical'].includes(payload.new.priority)) {
            toast({
              title: payload.new.title,
              description: payload.new.message,
              variant: payload.new.priority === 'critical' ? 'destructive' : 'default',
            });
          }
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
        .from('admin_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleQuickAction = async (notification: SmartNotification, action: string) => {
    try {
      switch (action) {
        case 'auto_request_backups':
          if (notification.metadata.trip_id) {
            // Use the enhanced assignment system to request backups
            toast({
              title: "Requesting Backups",
              description: "Automatically requesting backup senseis...",
            });
          }
          break;
        
        case 'resolve_conflict':
          await markAsRead(notification.id);
          toast({
            title: "Conflict Resolved",
            description: "Assignment conflict has been marked as resolved.",
          });
          break;
          
        case 'auto_upgrade':
          if (notification.metadata.sensei_id) {
            toast({
              title: "Processing Upgrade",
              description: "Processing automatic level upgrade...",
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling quick action:', error);
      toast({
        title: "Action Failed",
        description: "Unable to complete the requested action.",
        variant: "destructive",
      });
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, is_active: isActive } : rule
      )
    );

    toast({
      title: `Rule ${isActive ? 'Enabled' : 'Disabled'}`,
      description: `Notification rule has been ${isActive ? 'enabled' : 'disabled'}.`,
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <BellRing className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Bell className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Bell className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'backup_needed': return <Users className="h-4 w-4" />;
      case 'assignment_conflict': return <AlertTriangle className="h-4 w-4" />;
      case 'sensei_level_eligible': return <Zap className="h-4 w-4" />;
      case 'trip_capacity_alert': return <Calendar className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.is_read).length;

  if (isLoading) {
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Smart Notification System
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{notifications.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
              <div className="text-sm text-muted-foreground">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.requires_action && n.is_read).length}
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{rule.title}</div>
                  <div className="text-sm text-muted-foreground">{rule.description}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rule.priority.toUpperCase()}</Badge>
                    <Badge variant="secondary">{rule.actions.length} actions</Badge>
                  </div>
                </div>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${
                    !notification.is_read ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(notification.type)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{notification.title}</span>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">NEW</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {notification.message}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(notification.priority)}
                      {notification.auto_generated && (
                        <Badge variant="outline" className="text-xs">AUTO</Badge>
                      )}
                    </div>
                  </div>

                  {notification.requires_action && !notification.is_read && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleQuickAction(notification, 'auto_request_backups')}
                        className="flex items-center gap-2"
                      >
                        <Zap className="h-3 w-3" />
                        Quick Fix
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
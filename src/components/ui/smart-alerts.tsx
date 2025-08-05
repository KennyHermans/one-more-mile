import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Info, CheckCircle, X, Eye, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  data?: any;
}

interface SmartAlertsProps {
  onAlertAction?: (alertId: string, action: string) => void;
}

export function SmartAlerts({ onAlertAction }: SmartAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadRealAlerts();
  }, []);

  const loadRealAlerts = async () => {
    try {
      const { data: adminAlerts, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedAlerts: Alert[] = (adminAlerts || []).map(alert => ({
        id: alert.id,
        type: alert.priority === 'critical' ? 'critical' : 
              alert.priority === 'high' ? 'warning' : 
              alert.priority === 'medium' ? 'info' : 'info',
        title: alert.title,
        description: alert.message,
        timestamp: new Date(alert.created_at),
        isRead: alert.resolved_by !== null,
        actions: [{
          label: 'Resolve',
          action: () => resolveAlert(alert.id),
          variant: 'default' as const
        }],
        data: alert.metadata
      }));

      setAlerts(transformedAlerts);
    } catch (error) {
      toast({
        title: "Error loading alerts",
        description: "Failed to fetch system alerts",
        variant: "destructive"
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: "Alert resolved",
        description: "The alert has been marked as resolved"
      });
    } catch (error) {
      toast({
        title: "Error resolving alert",
        description: "Failed to resolve the alert",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
    }
  };

  const getBadgeColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-amber-100 text-amber-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'success': return 'bg-green-100 text-green-800';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'critical') return alert.type === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const criticalCount = alerts.filter(alert => alert.type === 'critical' && !alert.isRead).length;

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={() => setIsCollapsed(false)}
          className="relative"
          variant="outline"
          size="sm"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500 text-white"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed top-20 right-4 w-96 max-h-[70vh] z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Smart Alerts
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            All ({alerts.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs"
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
            className="text-xs"
          >
            Critical ({criticalCount})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="max-h-[50vh] overflow-y-auto space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No alerts to show</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)} ${
                !alert.isRead ? 'ring-2 ring-offset-1 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {alert.title}
                    </h4>
                    <Badge className={`text-xs ${getBadgeColor(alert.type)}`}>
                      {alert.type}
                    </Badge>
                    {!alert.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {alert.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(alert.timestamp)} ago
                    </span>
                    
                    <div className="flex items-center gap-1">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {alert.actions && alert.actions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {alert.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || 'default'}
                          size="sm"
                          onClick={() => {
                            action.action();
                            markAsRead(alert.id);
                            onAlertAction?.(alert.id, action.label);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Notification system for dashboard integration
export function NotificationCenter() {
  const [hasNewAlerts, setHasNewAlerts] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAlerts(!showAlerts)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {hasNewAlerts && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </Button>
      
      {showAlerts && (
        <SmartAlerts 
          onAlertAction={(alertId, action) => {
            toast({
              title: "Action performed",
              description: `${action} action completed for alert`
            });
          }}
        />
      )}
    </>
  );
}
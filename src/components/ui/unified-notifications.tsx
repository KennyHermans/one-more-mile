import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertTriangle, MessageSquare, Calendar, Settings } from "lucide-react";
import { format } from "date-fns";

interface NotificationItem {
  id: string;
  type: "system" | "trip" | "message" | "announcement";
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface UnifiedNotificationsProps {
  notifications?: NotificationItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export function UnifiedNotifications({ 
  notifications = [], 
  onMarkAsRead,
  onMarkAllAsRead 
}: UnifiedNotificationsProps) {
  const [activeTab, setActiveTab] = useState("all");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-blue-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "system": return AlertTriangle;
      case "trip": return Calendar;
      case "message": return MessageSquare;
      case "announcement": return Bell;
      default: return Bell;
    }
  };

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="trip">Trips</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
            <TabsTrigger value="announcement">News</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications found
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const IconComponent = getTypeIcon(notification.type);
                return (
                  <div 
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.read ? "bg-muted/20" : "bg-background"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={getPriorityColor(notification.priority)}
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(notification.timestamp, "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <div className="flex gap-2">
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onMarkAsRead?.(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Button variant="outline" size="sm">
                                {notification.actionLabel || "View"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
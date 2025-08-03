import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  FileText,
  MapPin,
  Calendar,
  Users,
  Settings,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  Shield,
  MessageCircle,
  Home,
  Edit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";

const sidebarGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        value: "dashboard",
        icon: Home,
        requiresPermission: null
      },
      {
        title: "Analytics",
        value: "analytics", 
        icon: BarChart3,
        requiresPermission: null
      }
    ]
  },
  {
    label: "Operations",
    items: [
      {
        title: "Applications",
        value: "applications",
        icon: FileText,
        badge: true,
        requiresPermission: "canManageSenseis"
      },
      {
        title: "Trip Management",
        value: "trips",
        icon: MapPin,
        requiresPermission: "canManageTrips"
      },
      {
        title: "Sensei Assignment",
        value: "sensei-assignment",
        icon: Shield,
        requiresPermission: "canManageSenseis"
      },
      {
        title: "Calendar",
        value: "calendar",
        icon: Calendar,
        requiresPermission: null
      },
      {
        title: "Trip Editor",
        value: "trip-editor",
        icon: Edit,
        requiresPermission: "canManageTrips"
      },
      {
        title: "Trip Permissions",
        value: "trip-permissions",
        icon: Settings,
        requiresPermission: "canManageTrips"
      }
    ]
  },
  {
    label: "Content & Communication",
    items: [
      {
        title: "Trip Proposals",
        value: "proposals",
        icon: TrendingUp,
        requiresPermission: "canManageTrips"
      },
      {
        title: "Announcements",
        value: "announcements",
        icon: Megaphone,
        requiresPermission: null
      },
      {
        title: "Feedback",
        value: "feedback",
        icon: MessageCircle,
        requiresPermission: "canViewCustomers"
      },
      {
        title: "Cancellations",
        value: "cancellations",
        icon: AlertTriangle,
        requiresPermission: "canManageTrips"
      }
    ]
  },
  {
    label: "Management",
    items: [
      {
        title: "Senseis",
        value: "senseis",
        icon: Users,
        requiresPermission: "canManageSenseis"
      },
      {
        title: "Role Management",
        value: "roles",
        icon: Shield,
        requiresPermission: "canManageFinances"
      },
      {
        title: "Settings",
        value: "settings",
        icon: Settings,
        requiresPermission: "canManageFinances"
      }
    ]
  }
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingApplications: number;
}

export function AdminSidebar({ activeTab, onTabChange, pendingApplications }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { permissions } = useAdminPermissions();
  const navigate = useNavigate();

  const handleItemClick = (value: string) => {
    if (value === "trip-editor") {
      navigate("/admin/trips");
    } else {
      onTabChange(value);
    }
  };

  const isActive = (value: string) => {
    return activeTab === value;
  };

  const hasPermission = (requiredPermission: string | null) => {
    if (!requiredPermission) return true;
    return permissions[requiredPermission as keyof typeof permissions] === true;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {sidebarGroups.map((group) => {
          const visibleItems = group.items.filter(item => hasPermission(item.requiresPermission));
          
          if (visibleItems.length === 0) return null;
          
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={() => handleItemClick(item.value)}
                        className={`cursor-pointer transition-colors ${
                          isActive(item.value) 
                            ? "bg-accent text-accent-foreground font-medium" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex items-center justify-between w-full">
                          {item.title}
                          {item.badge && pendingApplications > 0 && !isCollapsed && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {pendingApplications}
                            </Badge>
                          )}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
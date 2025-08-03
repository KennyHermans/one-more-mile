import { useState } from "react";
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
  Home
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sidebarGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        value: "dashboard",
        icon: Home
      },
      {
        title: "Analytics",
        value: "analytics", 
        icon: BarChart3
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
        badge: true
      },
      {
        title: "Trip Management",
        value: "trips",
        icon: MapPin
      },
      {
        title: "Sensei Assignment",
        value: "sensei-assignment",
        icon: Shield
      },
      {
        title: "Calendar",
        value: "calendar",
        icon: Calendar
      }
    ]
  },
  {
    label: "Content & Communication",
    items: [
      {
        title: "Trip Proposals",
        value: "proposals",
        icon: TrendingUp
      },
      {
        title: "Announcements",
        value: "announcements",
        icon: Megaphone
      },
      {
        title: "Feedback",
        value: "feedback",
        icon: MessageCircle
      },
      {
        title: "Cancellations",
        value: "cancellations",
        icon: AlertTriangle
      }
    ]
  },
  {
    label: "Management",
    items: [
      {
        title: "Senseis",
        value: "senseis",
        icon: Users
      },
      {
        title: "Settings",
        value: "settings",
        icon: Settings
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

  const handleItemClick = (value: string) => {
    onTabChange(value);
  };

  const isActive = (value: string) => {
    return activeTab === value;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
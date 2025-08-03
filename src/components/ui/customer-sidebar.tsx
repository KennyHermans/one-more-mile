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
  MapPin,
  Bell,
  MessageCircle,
  Star,
  User,
  Home
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/priority-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sidebarItems = [
  {
    title: "Overview",
    value: "overview",
    icon: Home,
    description: "Dashboard home with key metrics and quick actions"
  },
  {
    title: "My Trips",
    value: "trips",
    icon: MapPin,
    description: "All trip activities, calendar, and booking management"
  },
  {
    title: "Messages",
    value: "messages",
    icon: MessageCircle,
    description: "Unified communication hub"
  },
  {
    title: "Reviews",
    value: "reviews",
    icon: Star,
    description: "Trip ratings and feedback"
  },
  {
    title: "Profile",
    value: "profile",
    icon: User,
    description: "Personal info, documents, and settings"
  },
  {
    title: "Notifications",
    value: "notifications",
    icon: Bell,
    description: "All alerts, news, and announcements"
  }
];

interface CustomerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCounts?: Record<string, number>;
}

export function CustomerSidebar({ activeTab, onTabChange, notificationCounts = {} }: CustomerSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleItemClick = (value: string) => {
    onTabChange(value);
  };

  const isActive = (value: string) => {
    return activeTab === value;
  };

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          onClick={() => handleItemClick(item.value)}
                          className={`cursor-pointer transition-colors ${
                            isActive(item.value) 
                              ? "bg-accent text-accent-foreground font-medium" 
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {notificationCounts[item.value] && (
                            <PriorityBadge 
                              priority={item.value === "notifications" ? "urgent" : "medium"}
                              count={notificationCounts[item.value]}
                              className="ml-auto"
                            />
                          )}
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
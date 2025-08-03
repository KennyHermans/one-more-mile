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
  Megaphone,
  MessageCircle,
  Star,
  User,
  CalendarIcon as Calendar,
  CheckSquare,
  FileText,
  Home
} from "lucide-react";

const sidebarItems = [
  {
    title: "Overview",
    value: "overview",
    icon: Home
  },
  {
    title: "My Trips",
    value: "trips",
    icon: MapPin
  },
  {
    title: "Notifications",
    value: "notifications",
    icon: Bell
  },
  {
    title: "News",
    value: "news",
    icon: Megaphone
  },
  {
    title: "Messages",
    value: "messages",
    icon: MessageCircle
  },
  {
    title: "Reviews",
    value: "reviews",
    icon: Star
  },
  {
    title: "Profile",
    value: "profile",
    icon: User
  },
  {
    title: "Calendar",
    value: "calendar",
    icon: Calendar
  },
  {
    title: "To-Do",
    value: "todos",
    icon: CheckSquare
  },
  {
    title: "Documents",
    value: "documents",
    icon: FileText
  }
];

interface CustomerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function CustomerSidebar({ activeTab, onTabChange }: CustomerSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleItemClick = (value: string) => {
    onTabChange(value);
  };

  const isActive = (value: string) => {
    return activeTab === value;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
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
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
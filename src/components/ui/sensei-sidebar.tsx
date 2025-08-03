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
  Target,
  MapPin,
  Shield,
  FileText,
  Edit3,
  Send,
  FileCheck,
  Megaphone,
  MessageCircle,
  Calendar,
  CheckSquare,
  Settings,
  Home
} from "lucide-react";

const sidebarItems = [
  {
    title: "Overview",
    value: "overview",
    icon: Home
  },
  {
    title: "Analytics",
    value: "analytics", 
    icon: BarChart3
  },
  {
    title: "Goals",
    value: "goals",
    icon: Target
  },
  {
    title: "My Trips",
    value: "trips",
    icon: MapPin
  },
  {
    title: "Backup Sensei",
    value: "backup-sensei",
    icon: Shield
  },
  {
    title: "Applications",
    value: "applications",
    icon: FileText
  },
  {
    title: "Trip Editor",
    value: "trip-editor",
    icon: Edit3
  },
  {
    title: "Proposals",
    value: "proposals",
    icon: Send
  },
  {
    title: "Certificates",
    value: "certificates",
    icon: FileCheck
  },
  {
    title: "Announcements",
    value: "announcements",
    icon: Megaphone
  },
  {
    title: "Messages",
    value: "messages",
    icon: MessageCircle
  },
  {
    title: "Calendar",
    value: "calendar",
    icon: Calendar
  },
  {
    title: "Todos",
    value: "todos",
    icon: CheckSquare
  },
  {
    title: "Settings",
    value: "availability",
    icon: Settings
  }
];

interface SenseiSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SenseiSidebar({ activeTab, onTabChange }: SenseiSidebarProps) {
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
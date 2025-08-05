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
  Home,
  Crown
} from "lucide-react";

const sidebarItems = [
  // Main Dashboard
  {
    title: "Overview",
    value: "overview",
    icon: Home,
    group: "main"
  },
  {
    title: "My Trips",
    value: "trips",
    icon: MapPin,
    group: "main"
  },
  
  // Professional Development
  {
    title: "Level & Progress",
    value: "gamification",
    icon: Crown,
    group: "professional"
  },
  {
    title: "Certificates",
    value: "certificates",
    icon: FileCheck,
    group: "professional"
  },
  
  // Trip Management
  {
    title: "Trip Proposals",
    value: "proposals",
    icon: Edit3,
    group: "trips"
  },
  {
    title: "Backup Requests",
    value: "backup-sensei",
    icon: Shield,
    group: "trips"
  },
  
  // Communication
  {
    title: "Messages",
    value: "messages",
    icon: MessageCircle,
    group: "communication"
  },
  {
    title: "Announcements",
    value: "announcements",
    icon: Megaphone,
    group: "communication"
  },
  
  // Applications & Settings
  {
    title: "My Applications",
    value: "applications",
    icon: FileText,
    group: "settings"
  },
  {
    title: "Availability",
    value: "availability",
    icon: Settings,
    group: "settings"
  }
];

const sidebarGroups = [
  { key: "main", label: "Dashboard" },
  { key: "professional", label: "Development" },
  { key: "trips", label: "Trip Management" },
  { key: "communication", label: "Communication" },
  { key: "settings", label: "Settings" }
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
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems
                  .filter((item) => item.group === group.key)
                  .map((item) => (
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
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
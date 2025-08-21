import { useState, useEffect } from "react";
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
  MapPin,
  Shield,
  FileText,
  Edit3,
  Send,
  FileCheck,
  Megaphone,
  MessageCircle,
  CheckSquare,
  Settings,
  Home,
  Crown,
  Plus,
  Sparkles,
  Wallet
} from "lucide-react";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { useSenseiLevel } from "@/contexts/SenseiLevelContext";
import { supabase } from "@/integrations/supabase/client";

const getPermissionBasedSidebarItems = (permissions: any) => [
  // Main Dashboard - Always visible
  {
    title: "Overview",
    value: "overview",
    icon: Home,
    group: "main",
    requiredPermission: null
  },
  
  // Trip Management - Conditional
  ...(permissions?.can_view_trips ? [{
    title: "My Trips",
    value: "trips",
    icon: MapPin,
    group: "main",
    requiredPermission: "can_view_trips"
  }] : []),
  
  
  // Trip Creation - High level permission
  ...(permissions?.can_create_trips ? [{
    title: "Create Trip",
    value: "create-trip", 
    icon: Plus,
    group: "creation",
    requiredPermission: "can_create_trips"
  }] : []),
  
  // AI Builder - Premium feature
  ...(permissions?.can_use_ai_builder ? [{
    title: "AI Trip Builder",
    value: "ai-builder",
    icon: Sparkles,
    group: "creation",
    requiredPermission: "can_use_ai_builder"
  }] : []),
  
  // Professional Development - Always visible
  {
    title: "Level & Progress",
    value: "gamification",
    icon: Crown,
    group: "professional",
    requiredPermission: null
  },
  {
    title: "Analytics",
    value: "analytics", 
    icon: BarChart3,
    group: "professional",
    requiredPermission: null
  },
  {
    title: "Certificates",
    value: "certificates",
    icon: FileCheck,
    group: "professional",
    requiredPermission: null
  },
  {
    title: "Payouts",
    value: "payouts",
    icon: Wallet,
    group: "professional",
    requiredPermission: null
  },
  {
    title: "Warranty",
    value: "warranty",
    icon: Shield,
    group: "professional",
    requiredPermission: null
  },
  
  // Communication - Always visible
  {
    title: "Messages",
    value: "messages",
    icon: MessageCircle,
    group: "communication",
    requiredPermission: null
  },
  {
    title: "Announcements",
    value: "announcements",
    icon: Megaphone,
    group: "communication",
    requiredPermission: null
  },
  
  // Applications & Backup - Conditional
  ...(permissions?.can_apply_backup ? [{
    title: "Applications",
    value: "applications",
    icon: FileText,
    group: "admin",
    requiredPermission: "can_apply_backup"
  }] : []),
  
  ...(permissions?.can_apply_backup ? [{
    title: "Backup Sensei",
    value: "backup-sensei",
    icon: Shield,
    group: "admin",
    requiredPermission: "can_apply_backup"
  }] : []),
  
  // Settings - Always visible
  {
    title: "Availability",
    value: "availability",
    icon: Settings,
    group: "settings",
    requiredPermission: null
  }
];

const sidebarGroups = [
  { key: "main", label: "Dashboard" },
  { key: "creation", label: "Trip Creation" },
  { key: "professional", label: "Professional" },
  { key: "communication", label: "Communication" },
  { key: "admin", label: "Applications" },
  { key: "settings", label: "Settings" }
];

interface SenseiSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SenseiSidebar({ activeTab, onTabChange }: SenseiSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [senseiId, setSenseiId] = useState<string | undefined>();
  const { permissions, isLoading } = useSenseiPermissions(senseiId);
  const { isLevelChanging } = useSenseiLevel();

  useEffect(() => {
    const fetchSenseiId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('sensei_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setSenseiId(data.id);
        }
      }
    };

    fetchSenseiId();
  }, []);

  const sidebarItems = getPermissionBasedSidebarItems(permissions);

  const handleItemClick = (value: string) => {
    onTabChange(value);
  };

  const isActive = (value: string) => {
    return activeTab === value;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {isLevelChanging && (
          <div className="p-4 text-sm text-muted-foreground text-center border-b">
            🔄 Updating permissions...
          </div>
        )}
        {sidebarGroups.map((group) => {
          const groupItems = sidebarItems.filter((item) => item.group === group.key);
          
          // Don't render empty groups
          if (groupItems.length === 0) return null;
          
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={() => handleItemClick(item.value)}
                        className={`cursor-pointer transition-colors ${
                          isActive(item.value) 
                            ? "bg-accent text-accent-foreground font-medium" 
                            : "hover:bg-muted/50"
                        } ${isLevelChanging ? 'opacity-60' : ''}`}
                        disabled={isLevelChanging}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
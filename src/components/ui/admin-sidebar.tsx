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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Edit,
  Bot,
  Brain,
  ChevronRight,
  ClipboardList,
  UserCheck,
  Target,
  Award
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
    ]
  },
  {
    label: "Operations",
    items: [
      {
        title: "Trip Management",
        value: "trip-management",
        icon: MapPin,
        requiresPermission: "canManageTrips"
      },
      {
        title: "Sensei Management",
        value: "sensei-management",
        icon: Users,
        requiresPermission: "canManageSenseis",
        subItems: [
          {
            title: "Overview",
            value: "sensei-overview",
            icon: Home,
            requiresPermission: "canManageSenseis"
          },
          {
            title: "Applications",
            value: "sensei-applications",
            icon: ClipboardList,
            badge: true,
            requiresPermission: "canManageSenseis"
          },
          {
            title: "Active Senseis",
            value: "sensei-active",
            icon: UserCheck,
            requiresPermission: "canManageSenseis"
          },
          {
            title: "Trip Assignment",
            value: "sensei-assignments",
            icon: Target,
            requiresPermission: "canManageSenseis"
          },
          {
            title: "Level Management",
            value: "sensei-levels",
            icon: Award,
            requiresPermission: "canManageSenseis"
          }
        ]
      }
    ]
  },
  {
    label: "Automation",
    items: [
      {
        title: "Automation Settings",
        value: "automation",
        icon: Bot,
        requiresPermission: null
      }
    ]
  },
  {
    label: "Content & Communication",
    items: [
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
      }
    ]
  },
  {
    label: "Administration",
    items: [
      {
        title: "Role Management",
        value: "roles",
        icon: Shield,
        requiresPermission: "canManageRoles"
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['sensei-management']));

  const handleItemClick = (value: string) => {
    if (value === "trip-management") {
      navigate("/admin/trips");
    } else {
      onTabChange(value);
    }
  };

  const handleSubItemClick = (value: string) => {
    // Map sub-item values to existing tab values in SenseiManagementDashboard
    const tabMapping: Record<string, string> = {
      'sensei-overview': 'overview',
      'sensei-applications': 'applications', 
      'sensei-active': 'active-senseis',
      'sensei-assignments': 'assignments',
      'sensei-levels': 'management'
    };
    
    const mappedTab = tabMapping[value] || value;
    onTabChange(`sensei-management-${mappedTab}`);
  };

  const toggleExpanded = (value: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  const isActive = (value: string) => {
    return activeTab === value || activeTab.startsWith(`${value}-`);
  };

  const isSubItemActive = (parentValue: string, subValue: string) => {
    if (activeTab === parentValue) return subValue === 'overview';
    return activeTab === `${parentValue}-${subValue}`;
  };

  const hasPermission = (requiredPermission: string | null) => {
    if (!requiredPermission) return true;
    return permissions[requiredPermission as keyof typeof permissions] === true;
  };

  const shouldShowBadge = (item: any, isSubItem: boolean = false) => {
    return (item.badge || (isSubItem && item.value === 'sensei-applications')) && 
           pendingApplications > 0 && !isCollapsed;
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
                  {visibleItems.map((item) => {
                    if (item.subItems && item.subItems.length > 0) {
                      // Handle items with sub-navigation
                      const visibleSubItems = item.subItems.filter(subItem => 
                        hasPermission(subItem.requiresPermission)
                      );
                      
                      if (visibleSubItems.length === 0) return null;
                      
                      const isExpanded = expandedItems.has(item.value);
                      
                      return (
                        <Collapsible 
                          key={item.title}
                          open={isExpanded}
                          onOpenChange={() => toggleExpanded(item.value)}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton 
                                className={`cursor-pointer transition-colors ${
                                  isActive(item.value) 
                                    ? "bg-accent text-accent-foreground font-medium" 
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="flex items-center justify-between w-full">
                                  {item.title}
                                  <ChevronRight className={`h-4 w-4 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`} />
                                </span>
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {visibleSubItems.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton 
                                      onClick={() => handleSubItemClick(subItem.value)}
                                       className={`cursor-pointer transition-colors ${
                                         isSubItemActive(item.value, subItem.value.replace('sensei-', '')) 
                                           ? "bg-accent text-accent-foreground font-medium" 
                                           : "hover:bg-muted/50"
                                       }`}
                                    >
                                      <subItem.icon className="h-4 w-4" />
                                      <span className="flex items-center justify-between w-full">
                                        {subItem.title}
                                        {shouldShowBadge(subItem, true) && (
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            {pendingApplications}
                                          </Badge>
                                        )}
                                      </span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    } else {
                      // Handle regular items without sub-navigation
                      return (
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
                              {shouldShowBadge(item) && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {pendingApplications}
                                </Badge>
                              )}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
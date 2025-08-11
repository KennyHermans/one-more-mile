import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Home, 
  Search, 
  Calendar, 
  User, 
  Bell, 
  MessageSquare,
  Settings,
  Globe,
  TrendingUp,
  Heart,
  Star
} from 'lucide-react';
import { useProfileManagement } from '@/hooks/use-profile-management';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
}

export const EnhancedMobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const { user } = useProfileManagement();
  const location = useLocation();
  const isMobile = useIsMobile();

  const getNavigationItems = (): NavigationItem[] => {
    const commonItems: NavigationItem[] = [
      {
        label: 'Home',
        href: '/',
        icon: Home,
        isActive: location.pathname === '/'
      },
      {
        label: 'Explore',
        href: '/explore',
        icon: Search,
        isActive: location.pathname === '/explore'
      }
    ];

    if (!user) {
      return commonItems;
    }

    const authenticatedItems: NavigationItem[] = [
      ...commonItems,
      {
        label: 'My Trips',
        href: '/customer/dashboard',
        icon: Calendar,
        isActive: location.pathname.includes('/dashboard')
      },
      {
        label: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        badge: 2,
        isActive: location.pathname === '/messages'
      },
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
        badge: unreadNotifications,
        isActive: location.pathname === '/notifications'
      }
    ];

    authenticatedItems.push({
      label: 'Profile',
      href: '/customer/profile',
      icon: User,
      isActive: location.pathname === '/customer/profile'
    });

    return authenticatedItems;
  };

  const quickActions = [
    { label: 'Trending', icon: TrendingUp, href: '/explore?filter=trending' },
    { label: 'Nearby', icon: Globe, href: '/explore?filter=nearby' },
    { label: 'Favorites', icon: Heart, href: '/favorites' },
    { label: 'Top Rated', icon: Star, href: '/explore?filter=top-rated' }
  ];

  // Bottom tab navigation for mobile
  const bottomNavItems = getNavigationItems().slice(0, 4);

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  {user && (
                    <p className="text-sm text-muted-foreground">
                      Welcome back, {user.email}
                    </p>
                  )}
                </div>

                <nav className="space-y-2 flex-1">
                  {getNavigationItems().map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center justify-between w-full p-3 rounded-lg transition-colors",
                        item.isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </nav>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => (
                      <Link
                        key={action.href}
                        to={action.href}
                        onClick={() => setIsOpen(false)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <action.icon className="h-4 w-4" />
                        <span className="text-xs">{action.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/explore" className="font-bold text-lg">
            One More Mile
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="flex items-center justify-around p-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition-colors relative",
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="md:hidden h-16 shrink-0" /> {/* Top spacer */}
      <div className="md:hidden h-20 shrink-0" /> {/* Bottom spacer */}
    </>
  );
};
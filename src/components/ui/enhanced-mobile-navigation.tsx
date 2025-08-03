import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "./sheet";
import { Badge } from "./badge";
import { Separator } from "./separator";
import { 
  Menu, 
  User, 
  Home, 
  MapPin, 
  Users, 
  Info, 
  MessageCircle,
  Settings,
  Calendar,
  Heart,
  Bell,
  LogOut,
  Crown,
  Shield,
  Compass,
  Mountain,
  Star,
  X,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  badge?: string;
  description?: string;
}

export function EnhancedMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSensei, setIsSensei] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const location = useLocation();
  const { toast } = useToast();

  // Check if current user is admin
  const isAdmin = user?.email === 'kenny_hermans93@hotmail.com';

  const checkSenseiStatus = async (userId: string) => {
    const { data } = await supabase
      .from('sensei_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    setIsSensei(!!data);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      setIsOpen(false);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
  };

  const fetchNotificationCount = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('customer_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);
      
      setUnreadNotifications(data?.length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setUnreadNotifications(0);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkSenseiStatus(session.user.id);
          // Fetch real notification count
          fetchNotificationCount(session.user.id);
        } else {
          setIsSensei(false);
          setUnreadNotifications(0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSenseiStatus(session.user.id);
        fetchNotificationCount(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const mainNavItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      description: "Back to homepage"
    },
    {
      icon: Compass,
      label: "Explore Trips",
      href: "/explore",
      description: "Discover amazing adventures"
    },
    {
      icon: Users,
      label: "Our Senseis",
      href: "/senseis",
      description: "Meet our expert guides"
    },
    {
      icon: Info,
      label: "About",
      href: "/about",
      description: "Learn about our mission"
    },
    {
      icon: MessageCircle,
      label: "Contact",
      href: "/contact",
      description: "Get in touch with us"
    }
  ];

  const userNavItems: NavItem[] = [
    ...(isSensei ? [{
      icon: Mountain,
      label: "Sensei Dashboard",
      href: "/sensei/dashboard",
      description: "Manage your trips"
    }] : []),
    ...(isAdmin ? [{
      icon: Shield,
      label: "Admin Dashboard",
      href: "/admin/dashboard",
      description: "System administration"
    }] : []),
    {
      icon: User,
      label: "Profile",
      href: "/customer/dashboard",
      description: "View your profile"
    },
    {
      icon: Calendar,
      label: "My Bookings",
      href: "/customer/dashboard",
      description: "Manage your trips"
    },
    {
      icon: Heart,
      label: "Wishlist",
      href: "/customer/dashboard",
      description: "Saved adventures",
      badge: "3"
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/customer/dashboard",
      description: "Updates & alerts",
      badge: unreadNotifications > 0 ? unreadNotifications.toString() : undefined
    }
  ];

  const isCurrentPath = (path: string) => {
    return location.pathname === path || 
           (path !== "/" && location.pathname.startsWith(path));
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = isCurrentPath(item.href);
    
    return (
      <Link 
        to={item.href}
        className={`group flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
          isActive 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'hover:bg-muted/50 text-foreground hover:text-primary'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-md transition-colors ${
            isActive ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10'
          }`}>
            <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{item.label}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground">{item.description}</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {item.badge && (
            <Badge variant="secondary" className="h-5 text-xs">
              {item.badge}
            </Badge>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Link>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden relative hover:bg-primary/10 transition-colors"
        >
          <Menu className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            </div>
          )}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[350px] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/eceedcc9-46a8-4a46-899c-93c3a120589a.png" 
                  alt="One More Mile Logo" 
                  className="h-8 w-auto"
                />
                <div>
                  <SheetTitle className="text-lg font-serif text-left">One More Mile</SheetTitle>
                  <p className="text-xs text-muted-foreground text-left">Adventure Awaits</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              {user && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Welcome back!</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    {isSensei && (
                      <Badge variant="outline" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Sensei
                      </Badge>
                    )}
                    {isAdmin && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Main Navigation */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
                  Navigate
                </h3>
                <div className="space-y-1">
                  {mainNavItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </div>

              {/* User Navigation */}
              {user && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
                      Your Account
                    </h3>
                    <div className="space-y-1">
                      {userNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Quick Actions */}
              {!user && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
                      Get Started
                    </h3>
                    <div className="space-y-2">
                      <Button asChild className="w-full justify-start h-12">
                        <Link to="/auth" onClick={() => setIsOpen(false)}>
                          <User className="w-4 h-4 mr-3" />
                          Sign In / Register
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full justify-start h-12">
                        <Link to="/become-sensei" onClick={() => setIsOpen(false)}>
                          <Star className="w-4 h-4 mr-3" />
                          Become a Sensei
                        </Link>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          {user && (
            <div className="p-6 pt-0 mt-auto">
              <Separator className="mb-4" />
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { EnhancedMobileNavigation } from "./enhanced-mobile-navigation";
import { RoleSwitcher } from "./role-switcher";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export function Navigation() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [hasSenseiProfile, setHasSenseiProfile] = useState(false);
  const [hasCustomerProfile, setHasCustomerProfile] = useState(false);
  const [currentRole, setCurrentRole] = useState<'customer' | 'sensei'>('customer');

  // Check if current user is admin
  const isAdmin = user?.email === 'kenny_hermans93@hotmail.com';

  const checkUserProfiles = async (userId: string) => {
    try {
      // Check for sensei profile
      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Check for customer profile
      const { data: customerData } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const isSensei = !!senseiData;
      const isCustomer = !!customerData;
      
      setHasSenseiProfile(isSensei);
      setHasCustomerProfile(isCustomer);
      
      // Set default role based on available profiles
      if (isSensei && !isCustomer) {
        setCurrentRole('sensei');
      } else {
        setCurrentRole('customer'); // Default to customer
      }
    } catch (error) {
      console.error('Error checking user profiles:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkUserProfiles(session.user.id);
        } else {
          setHasSenseiProfile(false);
          setHasCustomerProfile(false);
          setCurrentRole('customer');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserProfiles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <img 
            src="/lovable-uploads/eceedcc9-46a8-4a46-899c-93c3a120589a.png" 
            alt="One More Mile Logo" 
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-2xl font-serif font-semibold text-foreground group-hover:text-primary transition-colors">
            One More Mile
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/explore" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
            Explore Trips
          </Link>
          <Link to="/senseis" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
            Our Senseis
          </Link>
          <Link to="/about" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
            About
          </Link>
          <Link to="/contact" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
            Contact
          </Link>
            {user ? (
             <div className="flex items-center space-x-4">
               {/* Role-based Dashboard Links */}
               {currentRole === 'customer' && hasCustomerProfile && (
                 <Link to="/customer/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                   My Dashboard
                 </Link>
               )}
               
               {currentRole === 'sensei' && hasSenseiProfile && (
                 <Link to="/sensei/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                   Sensei Dashboard
                 </Link>
               )}
               
               {/* Admin Dashboard - only for admin */}
               {isAdmin && (
                 <Link to="/admin/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                   Admin Dashboard
                 </Link>
               )}
               
               {/* Role Switcher for dual-role users */}
               <RoleSwitcher
                 currentRole={currentRole}
                 hasCustomerProfile={hasCustomerProfile}
                 hasSenseiProfile={hasSenseiProfile}
                 onRoleChange={setCurrentRole}
               />
               
               {/* Role-based Profile buttons */}
               {currentRole === 'sensei' && hasSenseiProfile ? (
                 <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                   <Link to="/sensei-profile">
                     <User className="w-4 h-4 mr-2" />
                     Sensei Profile
                   </Link>
                 </Button>
               ) : hasCustomerProfile ? (
                 <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                   <Link to="/customer/profile">
                     <User className="w-4 h-4 mr-2" />
                     My Profile
                   </Link>
                 </Button>
               ) : (
                 <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                   <Link to="/customer/profile">
                     <User className="w-4 h-4 mr-2" />
                     Create Profile
                   </Link>
                 </Button>
               )}
            </div>
          ) : (
            <>
              <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                <Link to="/auth">Login</Link>
              </Button>
              <Button asChild className="font-sans font-medium transition-all duration-300 hover:scale-105">
                <Link to="/become-sensei">Become a Sensei</Link>
              </Button>
            </>
          )}
        </div>

        {/* Enhanced Mobile Navigation */}
        <EnhancedMobileNavigation />
      </div>
    </nav>
  );
}
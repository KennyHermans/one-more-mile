import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./button";
import { EnhancedMobileNavigation } from "./enhanced-mobile-navigation";
import { RoleSwitcher } from "./role-switcher";
import { User } from "lucide-react";
import { useProfileManagement } from "@/hooks/use-profile-management";

export function Navigation() {
  const { user, session, profileStatus } = useProfileManagement();
  const [currentRole, setCurrentRole] = useState<'customer' | 'sensei'>('customer');
  const navigate = useNavigate();

  // Check if current user is admin
  const isAdmin = user?.email === 'kenny_hermans93@hotmail.com' || user?.email === 'kenny.hermans1993@gmail.com';

  // Update current role when profile status changes
  useEffect(() => {
    if (!profileStatus.isLoading) {
      if (profileStatus.hasSenseiProfile && !profileStatus.hasCustomerProfile) {
        setCurrentRole('sensei');
      } else {
        setCurrentRole('customer'); // Default to customer
      }
    }
  }, [profileStatus]);

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
                {/* Dashboard Links - Always show the appropriate dashboard for current role */}
                {currentRole === 'customer' ? (
                  <Link to="/customer/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                    My Dashboard
                  </Link>
                ) : (
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
                  hasCustomerProfile={profileStatus.hasCustomerProfile}
                  hasSenseiProfile={profileStatus.hasSenseiProfile}
                  onRoleChange={setCurrentRole}
                />
                
                {/* Profile Management - Clear role-based access */}
                {currentRole === 'sensei' && profileStatus.hasSenseiProfile ? (
                  <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                    <Link to="/sensei-profile">
                      <User className="w-4 h-4 mr-2" />
                      Sensei Profile
                    </Link>
                  </Button>
                ) : currentRole === 'customer' ? (
                  <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                    <Link to="/customer/profile">
                      <User className="w-4 h-4 mr-2" />
                      {profileStatus.hasCustomerProfile ? 'My Profile' : 'Complete Profile'}
                    </Link>
                  </Button>
                ) : profileStatus.hasSenseiProfile ? (
                  <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                    <Link to="/customer/profile">
                      <User className="w-4 h-4 mr-2" />
                      Create Customer Profile
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

                {/* Become a Sensei CTA for customers who aren't Senseis yet */}
                {currentRole === 'customer' && profileStatus.hasCustomerProfile && !profileStatus.hasSenseiProfile && (
                  <Button asChild variant="default" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                    <Link to="/become-sensei">
                      Become a Sensei
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
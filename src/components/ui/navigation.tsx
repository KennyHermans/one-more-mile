import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { Menu, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Check if current user is admin
  const isAdmin = user?.email === 'kenny_hermans93@hotmail.com';

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
              <Link to="/my-applications" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                My Applications
              </Link>
               {isAdmin && (
                 <>
                   <Link to="/admin/applications" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                     Admin Applications
                   </Link>
                   <Link to="/admin/trips" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                     Manage Trips
                   </Link>
                 </>
               )}
              <Button asChild variant="outline" className="font-sans font-medium transition-all duration-300 hover:scale-105">
                <Link to="/sensei-profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
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

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background border-b border-border md:hidden">
            <div className="container py-4 space-y-4">
              <Link 
                to="/explore" 
                className="block text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Explore Trips
              </Link>
              <Link 
                to="/senseis" 
                className="block text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Our Senseis
              </Link>
              <Link 
                to="/about" 
                className="block text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="block text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
               {user ? (
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/my-applications" onClick={() => setIsOpen(false)}>
                      My Applications
                    </Link>
                  </Button>
                   {isAdmin && (
                     <>
                       <Button asChild variant="outline" className="w-full">
                         <Link to="/admin/applications" onClick={() => setIsOpen(false)}>
                           Admin Applications
                         </Link>
                       </Button>
                       <Button asChild variant="outline" className="w-full">
                         <Link to="/admin/trips" onClick={() => setIsOpen(false)}>
                           Manage Trips
                         </Link>
                       </Button>
                     </>
                   )}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/sensei-profile" onClick={() => setIsOpen(false)}>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full mb-2">
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/become-sensei" onClick={() => setIsOpen(false)}>
                      Become a Sensei
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
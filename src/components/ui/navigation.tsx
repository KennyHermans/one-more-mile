import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Menu, User, Home, MapPin, Users, Info, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSensei, setIsSensei] = useState(false);

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkSenseiStatus(session.user.id);
        } else {
          setIsSensei(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSenseiStatus(session.user.id);
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
               {isSensei && (
                 <>
                   <Link to="/sensei/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                     My Dashboard
                   </Link>
                 </>
               )}
               {isAdmin && (
                 <Link to="/admin/dashboard" className="font-sans text-foreground hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                   Admin Dashboard
                 </Link>
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

        {/* Mobile Navigation Drawer */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col space-y-6">
              {/* Logo section */}
              <div className="flex items-center space-x-2 pb-4 border-b border-border">
                <img 
                  src="/lovable-uploads/eceedcc9-46a8-4a46-899c-93c3a120589a.png" 
                  alt="One More Mile Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-serif font-semibold text-foreground">
                  One More Mile
                </span>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col space-y-4">
                <Link 
                  to="/" 
                  className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
                <Link 
                  to="/explore" 
                  className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Explore Trips</span>
                </Link>
                <Link 
                  to="/senseis" 
                  className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Users className="h-4 w-4" />
                  <span>Our Senseis</span>
                </Link>
                <Link 
                  to="/about" 
                  className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </Link>
                <Link 
                  to="/contact" 
                  className="flex items-center space-x-3 text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Contact</span>
                </Link>
              </div>

              {/* User section */}
              <div className="pt-4 border-t border-border">
                {user ? (
                  <div className="space-y-3">
                    {isSensei && (
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to="/sensei/dashboard" onClick={() => setIsOpen(false)}>
                          <User className="w-4 h-4 mr-2" />
                          My Dashboard
                        </Link>
                      </Button>
                    )}
                    {isAdmin && (
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                          <User className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/sensei-profile" onClick={() => setIsOpen(false)}>
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/become-sensei" onClick={() => setIsOpen(false)}>
                        Become a Sensei
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
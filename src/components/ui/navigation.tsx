import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { Menu, X } from "lucide-react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent transition-transform duration-300 group-hover:scale-105"></div>
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
          <Button asChild className="font-sans font-medium transition-all duration-300 hover:scale-105">
            <Link to="/become-sensei">Become a Sensei</Link>
          </Button>
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
              <Button asChild className="w-full">
                <Link to="/become-sensei" onClick={() => setIsOpen(false)}>
                  Become a Sensei
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
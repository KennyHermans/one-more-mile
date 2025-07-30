import { Button } from "./button";
import { Input } from "./input";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient with earth tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary/80"></div>
      
      {/* Content */}
      <div className="relative z-10 container text-center text-white animate-fade-in">
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight">
          Travel with Purpose.
          <br />
          <span className="font-sans font-light text-white/95">Connect through Experiences.</span>
        </h1>
        
        <p className="font-sans text-lg md:text-xl mb-8 max-w-3xl mx-auto text-white/90 leading-relaxed">
          Join our expert Senseis on transformative journeys around the world. 
          From sports retreats to culinary adventures, discover your next unforgettable experience.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button asChild size="lg" variant="secondary" className="font-sans font-medium bg-white text-primary hover:bg-white/90 transition-all duration-300 hover:scale-105">
            <Link to="/explore">
              Explore Trips <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-sans font-medium border-white text-white hover:bg-white hover:text-primary transition-all duration-300">
            <Link to="/become-sensei">Become a Sensei</Link>
          </Button>
        </div>

        {/* Newsletter signup */}
        <div className="max-w-md mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Enter your email for travel inspiration"
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70"
              />
            </div>
            <Button variant="secondary" className="font-sans font-medium bg-white text-primary hover:bg-white/90 transition-all duration-300">
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
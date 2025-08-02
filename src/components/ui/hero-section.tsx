import { Button } from "./button";
import { Input } from "./input";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src="/lovable-uploads/2474f079-a946-4975-88a2-b4704e35976f.png"
          alt="Majestic mountain landscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container text-center text-white animate-fade-in px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-sans font-medium border border-white/20 mb-6">
              ✨ Transformative Travel Experiences
            </span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
            One More Mile
            <br />
            <span className="font-sans font-light text-4xl md:text-5xl lg:text-6xl text-white/95 block mt-4">
              Where every journey becomes a story
            </span>
          </h1>
          
          <p className="font-sans text-xl md:text-2xl mb-12 max-w-4xl mx-auto text-white/90 leading-relaxed">
            Join expert Senseis on life-changing adventures that blend purpose with discovery. 
            From mountain summits to cultural depths, create memories that inspire for a lifetime.
          </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
          <Button asChild size="lg" className="font-sans font-semibold text-lg px-8 py-4 bg-accent hover:bg-accent/90 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-accent/25">
            <Link to="/explore">
              Start Your Adventure <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-sans font-semibold text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-foreground transition-all duration-300 backdrop-blur-sm">
            <Link to="/become-sensei">Become a Sensei</Link>
          </Button>
        </div>
        </div>

        {/* Newsletter signup */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <p className="font-sans text-lg font-medium mb-4 text-white">Get travel inspiration delivered to your inbox</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input 
                  placeholder="Enter your email"
                  className="pl-12 bg-white/10 border-white/30 text-white placeholder:text-white/70 font-sans h-12 rounded-xl backdrop-blur-sm"
                />
              </div>
              <Button variant="secondary" className="font-sans font-semibold bg-accent hover:bg-accent/90 text-white px-6 h-12 rounded-xl transition-all duration-300 hover:scale-105">
                Join Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
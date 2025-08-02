import { Button } from "./button";
import { Input } from "./input";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative">
      {/* Hero image with title overlay */}
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img 
            src="/lovable-uploads/2474f079-a946-4975-88a2-b4704e35976f.png"
            alt="Majestic mountain landscape"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
        </div>
        
        {/* Main title content */}
        <div className="relative z-10 container text-center text-white animate-fade-in px-4">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              One More Mile
              <br />
              <span className="font-sans font-light text-lg md:text-xl lg:text-2xl text-white/90 block mt-3">
                Where every journey becomes a story
              </span>
            </h1>
            
            <p className="font-sans text-base md:text-lg mb-10 max-w-3xl mx-auto text-white/80 leading-relaxed">
              Join expert Senseis on life-changing adventures that blend purpose with discovery. 
              From mountain summits to cultural depths, create memories that inspire for a lifetime.
            </p>
          
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild className="font-sans font-medium text-sm px-6 py-3 bg-accent hover:bg-accent/90 text-white shadow-lg transition-all duration-300">
                <Link to="/explore">
                  Start Your Adventure <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="font-sans font-medium text-sm px-6 py-3 border border-white/40 text-white bg-black/30 hover:bg-black/50 transition-all duration-300 backdrop-blur-sm">
                <Link to="/become-sensei">Become a Sensei</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
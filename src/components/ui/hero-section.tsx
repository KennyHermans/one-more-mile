import { Button } from "./button";
import { Input } from "./input";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

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
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-sans font-medium border border-white/20">
              ✨ Transformative Travel Experiences
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full text-sm font-sans font-medium border border-green-300/30 text-green-100">
              <ShieldCheck className="w-4 h-4" />
              All Senseis Verified
            </span>
          </div>
          
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
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button asChild className="font-sans font-medium text-sm px-6 py-3 bg-accent hover:bg-accent/90 text-white shadow-lg transition-all duration-300">
            <Link to="/explore">
              Start Your Adventure <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="font-sans font-medium text-sm px-6 py-3 border border-white/40 text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
            <Link to="/become-sensei">Become a Sensei</Link>
          </Button>
        </div>
        </div>

        {/* Newsletter signup - more subtle */}
        <div className="max-w-md mx-auto opacity-75">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="font-sans text-sm font-normal mb-3 text-white/80">Stay updated</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input 
                  placeholder="Enter email"
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60 font-sans h-10 rounded-lg backdrop-blur-sm text-sm"
                />
              </div>
              <Button variant="secondary" className="font-sans font-medium bg-accent/80 hover:bg-accent text-white px-4 h-10 rounded-lg transition-all duration-300 text-sm">
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
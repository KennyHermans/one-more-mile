import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsSection } from "@/components/ui/stats-section";
import { ThemeCard } from "@/components/ui/theme-card";
import { FeaturedTripCard } from "@/components/ui/featured-trip-card";
import { TripCardSkeleton } from "@/components/ui/trip-card-skeleton";
import { TestimonialsSection } from "@/components/ui/testimonials-section";
import { SocialProofSection } from "@/components/ui/social-proof-section";
import { Dumbbell, ChefHat, Heart, Globe } from "lucide-react";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for featured trips
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const themes = [
    {
      title: "Sports & Nutrition Retreats",
      description: "Transform your fitness journey with expert trainers and nutritionists in breathtaking locations.",
      icon: Dumbbell,
      image: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=600&h=400&fit=crop",
      link: "/explore?theme=culinary"
    },
    {
      title: "Wellness Reboot Journeys",
      description: "Rejuvenate your mind, body, and spirit with holistic wellness practices and mindfulness.",
      icon: Heart,
      image: "https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=600&h=400&fit=crop",
      link: "/explore?theme=wellness"
    },
    {
      title: "Cultural Immersion",
      description: "Experience authentic local traditions and connect deeply with diverse communities worldwide.",
      icon: Globe,
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop",
      link: "/explore?theme=cultural"
    }
  ];

  const featuredTrips = [
    {
      id: "1",
      title: "Himalayan Trekking & Mindfulness Retreat",
      destination: "Nepal",
      description: "A transformative 14-day journey combining high-altitude trekking with daily meditation and mindfulness practices.",
      price: "$3,299",
      dates: "Apr 15-28, 2024",
      groupSize: "8-12 people",
      sensei: "Maya Chen",
      image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&h=400&fit=crop",
      theme: "Wellness"
    },
    {
      id: "2", 
      title: "Italian Culinary Masterclass Tour",
      destination: "Tuscany, Italy",
      description: "Learn authentic Italian cooking from Michelin-starred chefs while exploring vineyards and local markets.",
      price: "$2,799",
      dates: "May 10-17, 2024",
      groupSize: "6-10 people",
      sensei: "Giuseppe Romano",
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop",
      theme: "Cultural"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <HeroSection />
      
      <StatsSection />
      
      {/* Themes Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Discover Your Adventure
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Choose from our carefully curated themes, each designed to create meaningful connections and lasting memories.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {themes.map((theme, index) => (
              <ThemeCard key={index} {...theme} />
            ))}
          </div>
        </div>
      </section>
      
      <SocialProofSection />
      
      <TestimonialsSection />
      
      {/* Featured Trips Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Upcoming Featured Trips
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join our next adventures led by expert Senseis who bring passion and knowledge to every journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              <>
                <TripCardSkeleton />
                <TripCardSkeleton />
                <TripCardSkeleton />
              </>
            ) : (
              featuredTrips.map((trip) => (
                <FeaturedTripCard key={trip.id} {...trip} />
              ))
            )}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container">
          {/* Newsletter signup and badges */}
          <div className="text-center mb-12">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <span className="inline-block px-4 py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full text-sm font-sans font-medium border border-primary-foreground/20 text-primary-foreground">
                ✨ Transformative Travel Experiences
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full text-sm font-sans font-medium border border-green-300/30 text-green-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All Senseis Verified
              </span>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
                <p className="font-sans text-lg font-medium mb-4 text-primary-foreground">Get travel inspiration delivered to your inbox</p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input 
                      placeholder="Enter your email"
                      className="pl-12 w-full bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/70 font-sans h-12 rounded-xl backdrop-blur-sm px-4"
                    />
                  </div>
                  <button className="font-sans font-semibold bg-accent hover:bg-accent/90 text-white px-6 h-12 rounded-xl transition-all duration-300 hover:scale-105">
                    Join Us
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/lovable-uploads/dab7f695-040e-443d-bacf-212d4277616b.png" alt="One More Mile Logo" className="h-10 w-10 rounded-full object-cover" />
                <span className="font-serif text-2xl font-semibold">One More Mile</span>
              </div>
              <p className="font-sans text-primary-foreground/80 mb-4 leading-relaxed">
                Creating purposeful travel experiences that connect people, cultures, and adventures around the world.
              </p>
            </div>
            <div>
              <h3 className="font-sans font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-primary-foreground/80 font-sans">
                <li><a href="/explore" className="hover:text-primary-foreground transition-colors duration-300">Explore Trips</a></li>
                <li><a href="/senseis" className="hover:text-primary-foreground transition-colors duration-300">Our Senseis</a></li>
                <li><a href="/about" className="hover:text-primary-foreground transition-colors duration-300">About Us</a></li>
                <li><a href="/contact" className="hover:text-primary-foreground transition-colors duration-300">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-sans font-semibold mb-4">For Senseis</h3>
              <ul className="space-y-2 text-primary-foreground/80 font-sans">
                <li><a href="/become-sensei" className="hover:text-primary-foreground transition-colors duration-300">Become a Sensei</a></li>
                <li><a href="/faq" className="hover:text-primary-foreground transition-colors duration-300">FAQ</a></li>
                <li><a href="/terms" className="hover:text-primary-foreground transition-colors duration-300">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-primary-foreground transition-colors duration-300">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60">
            <p className="font-sans">&copy; 2024 One More Mile. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

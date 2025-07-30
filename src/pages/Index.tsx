import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { ThemeCard } from "@/components/ui/theme-card";
import { FeaturedTripCard } from "@/components/ui/featured-trip-card";
import { Dumbbell, ChefHat, Heart, Globe } from "lucide-react";

const Index = () => {
  const themes = [
    {
      title: "Sports & Nutrition Retreats",
      description: "Transform your fitness journey with expert trainers and nutritionists in breathtaking locations.",
      icon: Dumbbell,
      image: "/placeholder.svg",
      link: "/explore?theme=sports"
    },
    {
      title: "Culinary Adventures",
      description: "Discover authentic flavors and cooking techniques with renowned chefs and local masters.",
      icon: ChefHat,
      image: "/placeholder.svg",
      link: "/explore?theme=culinary"
    },
    {
      title: "Wellness Reboot Journeys",
      description: "Rejuvenate your mind, body, and spirit with holistic wellness practices and mindfulness.",
      icon: Heart,
      image: "/placeholder.svg",
      link: "/explore?theme=wellness"
    },
    {
      title: "Cultural Immersion",
      description: "Experience authentic local traditions and connect deeply with diverse communities worldwide.",
      icon: Globe,
      image: "/placeholder.svg",
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
      image: "/placeholder.svg",
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
      image: "/placeholder.svg",
      theme: "Culinary"
    },
    {
      id: "3",
      title: "South African Safari & Conservation",
      destination: "Kruger National Park, South Africa",
      description: "Experience wildlife conservation firsthand while enjoying luxury safari accommodations and cultural exchanges.",
      price: "$4,599",
      dates: "Jun 2-12, 2024",
      groupSize: "10-16 people",
      sensei: "Thabo Mokoena",
      image: "/placeholder.svg",
      theme: "Cultural"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <HeroSection />
      
      {/* Themes Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Discover Your Adventure
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
      
      {/* Featured Trips Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Upcoming Featured Trips
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our next adventures led by expert Senseis who bring passion and knowledge to every journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredTrips.map((trip) => (
              <FeaturedTripCard key={trip.id} {...trip} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-accent"></div>
                <span className="text-xl font-bold">One More Mile</span>
              </div>
              <p className="text-primary-foreground/80 mb-4">
                Creating purposeful travel experiences that connect people, cultures, and adventures around the world.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-primary-foreground/80">
                <li><a href="/explore" className="hover:text-primary-foreground transition-colors">Explore Trips</a></li>
                <li><a href="/senseis" className="hover:text-primary-foreground transition-colors">Our Senseis</a></li>
                <li><a href="/about" className="hover:text-primary-foreground transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-primary-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Senseis</h3>
              <ul className="space-y-2 text-primary-foreground/80">
                <li><a href="/become-sensei" className="hover:text-primary-foreground transition-colors">Become a Sensei</a></li>
                <li><a href="/faq" className="hover:text-primary-foreground transition-colors">FAQ</a></li>
                <li><a href="/terms" className="hover:text-primary-foreground transition-colors">Terms & Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60">
            <p>&copy; 2024 One More Mile. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

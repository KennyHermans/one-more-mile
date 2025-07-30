import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, Users, Star } from "lucide-react";

const Explore = () => {
  const trips = [
    {
      id: "1",
      title: "Himalayan Trekking & Mindfulness Retreat",
      destination: "Nepal",
      description: "A transformative 14-day journey combining high-altitude trekking with daily meditation and mindfulness practices.",
      price: "$3,299",
      dates: "Apr 15-28, 2024",
      groupSize: "8-12 people",
      sensei: "Maya Chen",
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop",
      theme: "Wellness",
      rating: 4.9
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
      image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=800&h=600&fit=crop",
      theme: "Culinary",
      rating: 4.8
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
      image: "https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=800&h=600&fit=crop",
      theme: "Cultural",
      rating: 4.9
    },
    {
      id: "4",
      title: "Alpine Skiing & Fitness Retreat",
      destination: "Swiss Alps",
      description: "Combine world-class skiing with comprehensive fitness training in the breathtaking Swiss Alps.",
      price: "$3,899",
      dates: "Feb 5-12, 2024",
      groupSize: "8-14 people",
      sensei: "Klaus Weber",
      image: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=800&h=600&fit=crop",
      theme: "Sports",
      rating: 4.7
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
              Explore Adventures
            </h1>
            <p className="font-sans text-xl max-w-2xl mx-auto leading-relaxed">
              Discover transformative journeys led by expert Senseis around the world
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input 
                  placeholder="Search destinations or activities..."
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 backdrop-blur-sm"
                />
              </div>
              <select className="bg-white/20 border border-white/30 text-white rounded-lg px-4 py-2 backdrop-blur-sm">
                <option value="" className="text-foreground bg-background">All Themes</option>
                <option value="sports" className="text-foreground bg-background">Sports & Nutrition</option>
                <option value="culinary" className="text-foreground bg-background">Culinary Adventures</option>
                <option value="wellness" className="text-foreground bg-background">Wellness Reboot</option>
                <option value="cultural" className="text-foreground bg-background">Cultural Immersion</option>
              </select>
              <select className="bg-white/20 border border-white/30 text-white rounded-lg px-4 py-2 backdrop-blur-sm">
                <option value="" className="text-foreground bg-background">All Destinations</option>
                <option value="asia" className="text-foreground bg-background">Asia</option>
                <option value="europe" className="text-foreground bg-background">Europe</option>
                <option value="africa" className="text-foreground bg-background">Africa</option>
                <option value="americas" className="text-foreground bg-background">Americas</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Trip Cards */}
      <section className="py-16">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Available Adventures
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-sans text-muted-foreground">{trips.length} trips found</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {trips.map((trip) => (
              <Card key={trip.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={trip.image} 
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-white/90 text-primary">
                      {trip.theme}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center bg-white/90 rounded-full px-2 py-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                    <span className="font-sans text-sm font-medium">{trip.rating}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="font-sans text-sm font-medium">{trip.destination}</span>
                    </div>
                  </div>
                </div>
                
                <CardHeader>
                  <CardTitle className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                    {trip.title}
                  </CardTitle>
                  <p className="font-sans text-muted-foreground line-clamp-2">{trip.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4 font-sans">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{trip.dates}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{trip.groupSize}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Led by Sensei {trip.sensei}</p>
                      <p className="text-lg font-bold text-primary">{trip.price}</p>
                    </div>
                    <Button asChild className="font-medium">
                      <Link to={`/trip/${trip.id}`}>Learn More</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Explore;
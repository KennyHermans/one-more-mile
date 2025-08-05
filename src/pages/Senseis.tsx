import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SenseiCardSkeleton } from "@/components/ui/sensei-card-skeleton";
import { Star, MapPin, Users, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SenseiProfile {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  image_url: string | null;
  rating: number;
  trips_led: number;
  experience: string;
  location: string;
  specialties: string[];
}

const Senseis = () => {
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSenseis();
  }, []);

  const fetchSenseis = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) {
        console.error('Error fetching senseis:', error);
        return;
      }

      setSenseis(data || []);
    } catch (error) {
      console.error('Error fetching senseis:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-20">
        <div className="container text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
            Meet Our Senseis
          </h1>
          <p className="font-sans text-xl max-w-3xl mx-auto leading-relaxed">
            World-class experts who transform ordinary trips into extraordinary journeys of discovery and growth
          </p>
        </div>
      </section>

      {/* Senseis Grid */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Expert Guides
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              Each Sensei brings unique expertise, passion, and cultural insight to create transformative experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                <SenseiCardSkeleton />
                <SenseiCardSkeleton />
                <SenseiCardSkeleton />
                <SenseiCardSkeleton />
                <SenseiCardSkeleton />
                <SenseiCardSkeleton />
              </>
            ) : (
              senseis.map((sensei) => (
                <Card key={sensei.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                   <div className="relative">
                     <img 
                       src={sensei.image_url || "https://images.unsplash.com/photo-1494790108755-2616b612b385?w=400&h=400&fit=crop&crop=face"} 
                       alt={sensei.name}
                       className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                     />
                     <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1 flex items-center">
                       <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                       <span className="font-sans text-xs font-medium">{sensei.rating}</span>
                     </div>
                   </div>
                   
                   <CardHeader className="pb-3">
                     <div className="flex items-center justify-between mb-1">
                       <CardTitle className="font-serif text-lg text-foreground">{sensei.name}</CardTitle>
                       <Badge variant="secondary" className="text-xs">{sensei.specialty}</Badge>
                     </div>
                     <p className="font-sans text-sm text-muted-foreground leading-relaxed line-clamp-2">{sensei.bio}</p>
                   </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-1 gap-2 text-xs">
                       <div className="flex items-center gap-2">
                         <Users className="h-3 w-3 text-primary" />
                         <span className="font-sans">{sensei.trips_led} trips</span>
                         <Award className="h-3 w-3 text-primary ml-2" />
                         <span className="font-sans">{sensei.experience}</span>
                       </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span className="font-sans">{sensei.location}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {sensei.specialties.slice(0, 3).map((specialty, index) => (
                          <Badge key={index} variant="outline" className="font-sans text-xs px-2 py-0">
                            {specialty}
                          </Badge>
                        ))}
                        {sensei.specialties.length > 3 && (
                          <Badge variant="outline" className="font-sans text-xs px-2 py-0">
                            +{sensei.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                     
                     <Button 
                       onClick={() => window.location.href = `/senseis/${sensei.id}`}
                       className="w-full font-sans font-medium text-sm"
                       size="sm"
                     >
                       View Sensei
                     </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Join Our Community?
          </h2>
          <p className="font-sans text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Share your expertise and passion by becoming a Sensei with One More Mile
          </p>
          <Button asChild size="lg" className="font-sans font-medium">
            <a href="/become-sensei">Become a Sensei</a>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Senseis;
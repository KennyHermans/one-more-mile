import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Users, Star, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StatsCardProps {
  number: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

function StatsCard({ number, label, description, icon: Icon }: StatsCardProps) {
  return (
    <Card className="text-center border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="pt-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="font-serif text-4xl font-bold text-primary mb-2">{number}</div>
        <div className="font-sans font-semibold text-foreground mb-1">{label}</div>
        <div className="font-sans text-sm text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

export function StatsSection() {
  const [stats, setStats] = useState({
    activeTrips: 0,
    expertSenseis: 0,
    totalBookings: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get active trips count
        const { count: activeTripsCount } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get active senseis count
        const { count: activeSerisCount } = await supabase
          .from('sensei_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get total bookings count (representing lives changed)
        const { count: totalBookingsCount } = await supabase
          .from('trip_bookings')
          .select('*', { count: 'exact', head: true });

        setStats({
          activeTrips: activeTripsCount || 0,
          expertSenseis: activeSerisCount || 0,
          totalBookings: totalBookingsCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 to-background"></div>
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 font-sans">Why Choose One More Mile</Badge>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Adventures That Transform Lives
          </h2>
          <p className="font-sans text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join thousands of travelers who've discovered the magic of purposeful exploration
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <StatsCard
            number={`${stats.activeTrips}+`}
            label="Active Adventures"
            description="Unique experiences waiting for you"
            icon={Star}
          />
          <StatsCard
            number={`${stats.expertSenseis}+`}
            label="Expert Senseis"
            description="Passionate guides in their fields"
            icon={Users}
          />
          <StatsCard
            number={`${stats.totalBookings}+`}
            label="Lives Changed"
            description="Travelers who found their purpose"
            icon={Clock}
          />
        </div>
      </div>
    </section>
  );
}
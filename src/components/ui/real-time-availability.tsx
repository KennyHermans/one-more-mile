import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Calendar, Clock, MapPin, Users, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SenseiAvailability {
  id: string;
  name: string;
  image_url?: string;
  location: string;
  specialty: string;
  is_offline: boolean;
  availability_periods: any;
  rating: number;
  trips_led: number;
}

interface RealTimeAvailabilityProps {
  destination?: string;
  selectedDates?: string;
  maxParticipants?: number;
}

export function RealTimeAvailability({ 
  destination, 
  selectedDates, 
  maxParticipants 
}: RealTimeAvailabilityProps) {
  const [senseis, setSenseis] = useState<SenseiAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAvailableSenseis();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('sensei_availability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_profiles'
        },
        () => {
          fetchAvailableSenseis();
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAvailableSenseis();
      setLastUpdated(new Date());
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [destination, selectedDates, maxParticipants]);

  const fetchAvailableSenseis = async () => {
    try {
      let query = supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true);

      if (destination) {
        query = query.ilike('location', `%${destination}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSenseis((data || []) as SenseiAvailability[]);
    } catch (error) {
      console.error('Error fetching senseis:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAvailableNow = (sensei: SenseiAvailability) => {
    const periods = Array.isArray(sensei.availability_periods) ? sensei.availability_periods : [];
    return !sensei.is_offline && periods.length > 0;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Real-time Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Real-time Availability
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {senseis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No senseis available for your criteria
          </div>
        ) : (
          senseis.slice(0, 5).map((sensei) => (
            <div
              key={sensei.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={sensei.image_url} alt={sensei.name} />
                    <AvatarFallback>{sensei.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                    isAvailableNow(sensei) ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {isAvailableNow(sensei) ? (
                      <Wifi className="h-2 w-2 text-white m-1" />
                    ) : (
                      <WifiOff className="h-2 w-2 text-white m-1" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold">{sensei.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {sensei.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {sensei.trips_led} trips
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-1">
                    {sensei.specialty}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge 
                  variant={isAvailableNow(sensei) ? "default" : "outline"}
                  className={isAvailableNow(sensei) ? "bg-green-500 hover:bg-green-600" : ""}
                >
                  {isAvailableNow(sensei) ? "Available" : "Offline"}
                </Badge>
                
                {isAvailableNow(sensei) && (
                  <Button size="sm" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
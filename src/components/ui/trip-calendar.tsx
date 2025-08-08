import { useState, useEffect, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, MapPin, Users, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Trip, transformDbTrip } from '@/types/trip';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Trip;
}

const TripCalendar = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .order('dates', { ascending: true });

      if (error) throw error;
      const transformedTrips = (data || []).map(transformDbTrip);
      setTrips(transformedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load trips for calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateString: string): { start: Date; end: Date } => {
    // Handle various date formats like "March 15-22, 2024" or "March 15, 2024"
    try {
      if (dateString.includes('-')) {
        const parts = dateString.split(',');
        const year = parts[parts.length - 1].trim();
        const monthAndDays = parts[0].trim();
        
        const monthMatch = monthAndDays.match(/^(\w+)\s+(\d+)-(\d+)$/);
        if (monthMatch) {
          const [, month, startDay, endDay] = monthMatch;
          const startDate = moment(`${month} ${startDay}, ${year}`, 'MMMM D, YYYY').toDate();
          const endDate = moment(`${month} ${endDay}, ${year}`, 'MMMM D, YYYY').toDate();
          return { start: startDate, end: endDate };
        }
      }
      
      // Fallback for single dates
      const date = moment(dateString, ['MMMM D, YYYY', 'YYYY-MM-DD']).toDate();
      return { start: date, end: date };
    } catch (error) {
      // Fallback to current date if parsing fails
      const today = new Date();
      return { start: today, end: today };
    }
  };

  const events: CalendarEvent[] = useMemo(() => {
    return trips.map(trip => {
      const { start, end } = parseDate(trip.dates);
      return {
        id: trip.id,
        title: trip.title,
        start,
        end,
        resource: trip,
      };
    });
  }, [trips]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedTrip(event.resource);
    setDialogOpen(true);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const trip = event.resource;
    let backgroundColor = 'hsl(var(--primary))';
    
    if (trip.trip_status === 'review') {
      backgroundColor = 'hsl(var(--muted))';
    } else if (trip.current_participants >= trip.max_participants) {
      backgroundColor = 'hsl(var(--destructive))';
    } else if (trip.current_participants > trip.max_participants * 0.8) {
      backgroundColor = 'hsl(var(--accent))';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'review':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Trip Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Trip Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 md:h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              popup
              views={['month', 'week', 'agenda']}
              defaultView="month"
              className="bg-background"
            />
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent"></div>
              <span>Nearly Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-destructive"></div>
              <span>Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted"></div>
              <span>Pending Approval</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
          </DialogHeader>
          
          {selectedTrip && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedTrip.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedTrip.destination}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Dates</p>
                  <p className="text-sm text-muted-foreground">{selectedTrip.dates}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Sensei</p>
                  <p className="text-sm text-muted-foreground">{selectedTrip.sensei_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-sm text-muted-foreground">{selectedTrip.price}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">{selectedTrip.theme}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant={getStatusColor(selectedTrip.trip_status)}>
                  {selectedTrip.trip_status?.replace('_', ' ') || 'Unknown'}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedTrip.current_participants}/{selectedTrip.max_participants}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{selectedTrip.rating ? selectedTrip.rating.toFixed(1) : 'N/A'}</span>
                </div>

                <Badge variant="outline">{selectedTrip.difficulty_level}</Badge>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`/trip/${selectedTrip.id}`, '_blank')}
                >
                  View Details
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export { TripCalendar };
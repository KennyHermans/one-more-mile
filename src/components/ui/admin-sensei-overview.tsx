import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MapPin, Users, AlertCircle, CheckCircle, RefreshCw, Award, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { useRealtimeSenseiOverview } from '@/hooks/use-realtime-sensei-overview';

interface EnhancedSenseiStatus {
  sensei_id: string;
  sensei_name: string;
  // basic sensei level removed
  level_achieved_at: string;
  trips_led: number;
  is_linked_to_trip: boolean;
  current_trip_count: number;
  is_available: boolean;
  specialties: string[];
  certifications: string[];
  location: string;
  rating: number;
  verified_skills_count: number;
  pending_certificates_count: number;
  last_activity: string;
}


import { Trip } from '@/types/trip';
import { createMinimalTrip } from '@/types/trip-utils';

export function AdminSenseiOverview() {
  const { senseis, loading, refetch } = useRealtimeSenseiOverview();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .eq('trip_status', 'approved');
      
      if (error) throw error;
      
      // Transform the data to proper Trip objects
      const transformedTrips = (data || []).map(trip => createMinimalTrip({
        id: trip.id,
        title: trip.title,
        theme: trip.theme,
        dates: trip.dates,
        sensei_id: trip.sensei_id,
        destination: trip.destination || '',
        description: trip.description || '',
        price: trip.price || '0',
        group_size: trip.group_size || '',
        sensei_name: trip.sensei_name || '',
        trip_status: trip.trip_status,
        is_active: trip.is_active,
        rating: trip.rating,
        image_url: trip.image_url
      }));
      
      setTrips(transformedTrips);
    } catch (error) {
      // Handle error silently or with toast notification
    }
  };


  const assignSenseiToTrip = async (tripId: string, senseiId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ sensei_id: senseiId })
        .eq('id', tripId);

      if (error) throw error;
      
      toast.success('Sensei assigned to trip successfully');
      
      // Refresh data
      refetch();
      fetchTrips();
    } catch (error) {
      // Handle error silently or with toast notification
      toast.error('Failed to assign sensei to trip');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading sensei overview...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sensei Overview
            </div>
            <Button
              onClick={refetch}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trip Assignment</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Skills & Certs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senseis.map((sensei) => (
                <TableRow key={sensei.sensei_id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{sensei.sensei_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Level achieved: {new Date(sensei.level_achieved_at).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      Sensei
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sensei.is_available ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {sensei.is_linked_to_trip ? (
                      <Badge variant="default">
                        Linked ({sensei.current_trip_count} trips)
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Linked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Award className="h-3 w-3 text-muted-foreground" />
                        {sensei.trips_led} trips led
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sensei.verified_skills_count} verified skills
                        {sensei.pending_certificates_count > 0 && (
                          <span className="text-orange-600 ml-1">
                            • {sensei.pending_certificates_count} pending certs
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {Number(sensei.rating).toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {sensei.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {sensei.specialties.slice(0, 2).map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {sensei.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{sensei.specialties.length - 2}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sensei.certifications.slice(0, 2).map((cert, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                        {sensei.certifications.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{sensei.certifications.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {/* Quick Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Trip Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {trips.filter(trip => !trip.sensei_id).map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{trip.title}</h3>
                  <p className="text-sm text-muted-foreground">Theme: {trip.theme} | {trip.dates}</p>
                </div>
                <div className="flex gap-2">
                  {senseis.filter(s => s.is_available).map((sensei) => (
                    <Button
                      key={sensei.sensei_id}
                      size="sm"
                      variant="outline"
                      onClick={() => assignSenseiToTrip(trip.id, sensei.sensei_id)}
                    >
                      Assign {sensei.sensei_name}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
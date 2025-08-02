import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MapPin, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SenseiStatus {
  sensei_id: string;
  sensei_name: string;
  is_linked_to_trip: boolean;
  current_trip_count: number;
  is_available: boolean;
  specialties: string[];
  certifications: string[];
  location: string;
  rating: number;
}

interface SenseiSuggestion {
  sensei_id: string;
  sensei_name: string;
  match_score: number;
  matching_specialties: string[];
  matching_certifications: string[];
  location: string;
  rating: number;
  is_available: boolean;
}

interface Trip {
  id: string;
  title: string;
  theme: string;
  dates: string;
  sensei_id?: string;
}

export function AdminSenseiOverview() {
  const [senseis, setSenseis] = useState<SenseiStatus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [suggestions, setSuggestions] = useState<SenseiSuggestion[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSenseiStatus();
    fetchTrips();
  }, []);

  const fetchSenseiStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sensei_trip_status');
      if (error) throw error;
      setSenseis(data || []);
    } catch (error) {
      console.error('Error fetching sensei status:', error);
      toast.error('Failed to load sensei overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, theme, dates, sensei_id')
        .eq('is_active', true)
        .eq('trip_status', 'approved');
      
      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchSuggestions = async (trip: Trip) => {
    try {
      setSelectedTrip(trip);
      
      // Extract months from trip dates (basic parsing)
      const months: string[] = [];
      if (trip.dates.toLowerCase().includes('july')) months.push('July');
      if (trip.dates.toLowerCase().includes('august')) months.push('August');
      if (trip.dates.toLowerCase().includes('september')) months.push('September');
      
      const { data, error } = await supabase.rpc('suggest_senseis_for_trip', {
        trip_theme: trip.theme,
        trip_months: months
      });
      
      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to load suggestions');
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
      fetchSenseiStatus();
      fetchTrips();
    } catch (error) {
      console.error('Error assigning sensei:', error);
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sensei Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trip Assignment</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Specialties</TableHead>
                <TableHead>Certifications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senseis.map((sensei) => (
                <TableRow key={sensei.sensei_id}>
                  <TableCell className="font-medium">{sensei.sensei_name}</TableCell>
                  <TableCell>
                    {sensei.is_available ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip Sensei Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{trip.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">Theme: {trip.theme}</p>
                  <p className="text-sm text-muted-foreground mb-3">Dates: {trip.dates}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => fetchSuggestions(trip)}
                      >
                        View Suggestions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>
                          Sensei Suggestions for {selectedTrip?.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        {suggestions.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Match Score</TableHead>
                                <TableHead>Availability</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Matching Skills</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {suggestions.map((suggestion) => (
                                <TableRow key={suggestion.sensei_id}>
                                  <TableCell className="font-medium">
                                    {suggestion.sensei_name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="default">
                                      {suggestion.match_score} points
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {suggestion.is_available ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        Available
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                                        Unavailable
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      {Number(suggestion.rating).toFixed(1)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {suggestion.matching_specialties.length > 0 && (
                                        <div>
                                          <span className="text-xs font-medium">Specialties: </span>
                                          {suggestion.matching_specialties.map((s, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs mr-1">
                                              {s}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      {suggestion.matching_certifications.length > 0 && (
                                        <div>
                                          <span className="text-xs font-medium">Certs: </span>
                                          {suggestion.matching_certifications.map((c, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs mr-1">
                                              {c}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      onClick={() => assignSenseiToTrip(selectedTrip?.id || '', suggestion.sensei_id)}
                                      disabled={!suggestion.is_available}
                                    >
                                      Assign
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No suitable senseis found for this trip theme.
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
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
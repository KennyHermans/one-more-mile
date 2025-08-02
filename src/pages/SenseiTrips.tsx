import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  group_size: string;
  program: any;
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  image_url: string;
  theme: string;
  sensei_id: string;
}

interface TripPermissions {
  description?: boolean;
  program?: boolean;
  included_amenities?: boolean;
  excluded_items?: boolean;
  requirements?: boolean;
  dates?: boolean;
  price?: boolean;
  group_size?: boolean;
  title?: boolean;
  destination?: boolean;
  theme?: boolean;
}

interface ProgramDay {
  day: number;
  location: string;
  activities: string[];
  coordinates?: [number, number];
}

export default function SenseiTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [permissions, setPermissions] = useState<{ [key: string]: TripPermissions }>({});
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setUser(user);
    fetchSenseiTrips(user.id);
  };

  const fetchSenseiTrips = async (userId: string) => {
    try {
      // First get the sensei profile
      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!senseiProfile) {
        toast({
          title: "Access Denied",
          description: "You must have an approved Sensei profile to manage trips.",
          variant: "destructive",
        });
        return;
      }

      // Get trips assigned to this sensei
      const { data: tripsData } = await supabase
        .from('trips')
        .select('*')
        .eq('sensei_id', senseiProfile.id);

      // Get permissions for each trip
      const { data: permissionsData } = await supabase
        .from('trip_permissions')
        .select('trip_id, permissions')
        .eq('sensei_id', senseiProfile.id);

      const permissionsMap: { [key: string]: TripPermissions } = {};
      permissionsData?.forEach(p => {
        permissionsMap[p.trip_id] = p.permissions as TripPermissions;
      });

      const formattedTrips = (tripsData || []).map(trip => ({
        ...trip,
        program: Array.isArray(trip.program) ? trip.program : (trip.program ? JSON.parse(trip.program as string) : [])
      }));
      
      setTrips(formattedTrips);
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load your trips.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (tripId: string, field: keyof TripPermissions): boolean => {
    return permissions[tripId]?.[field] === true;
  };

  const handleSaveTrip = async () => {
    if (!editingTrip) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: editingTrip.title,
          destination: editingTrip.destination,
          description: editingTrip.description,
          price: editingTrip.price,
          dates: editingTrip.dates,
          group_size: editingTrip.group_size,
          program: editingTrip.program,
          included_amenities: editingTrip.included_amenities,
          excluded_items: editingTrip.excluded_items,
          requirements: editingTrip.requirements,
          theme: editingTrip.theme,
        })
        .eq('id', editingTrip.id);

      if (error) throw error;

      setTrips(trips.map(trip => 
        trip.id === editingTrip.id ? editingTrip : trip
      ));
      setEditingTrip(null);

      toast({
        title: "Success",
        description: "Trip updated successfully!",
      });
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to update trip.",
        variant: "destructive",
      });
    }
  };

  const addProgramDay = () => {
    if (!editingTrip) return;
    const newDay: ProgramDay = {
      day: editingTrip.program.length + 1,
      location: "",
      activities: [""]
    };
    setEditingTrip({
      ...editingTrip,
      program: [...editingTrip.program, newDay]
    });
  };

  const updateProgramDay = (dayIndex: number, field: keyof ProgramDay, value: any) => {
    if (!editingTrip) return;
    const updatedProgram = [...editingTrip.program];
    updatedProgram[dayIndex] = { ...updatedProgram[dayIndex], [field]: value };
    setEditingTrip({ ...editingTrip, program: updatedProgram });
  };

  const addActivity = (dayIndex: number) => {
    if (!editingTrip) return;
    const updatedProgram = [...editingTrip.program];
    updatedProgram[dayIndex].activities.push("");
    setEditingTrip({ ...editingTrip, program: updatedProgram });
  };

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    if (!editingTrip) return;
    const updatedProgram = [...editingTrip.program];
    updatedProgram[dayIndex].activities[activityIndex] = value;
    setEditingTrip({ ...editingTrip, program: updatedProgram });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading your trips...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Trips</h1>
        </div>

        {trips.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No trips assigned to you yet. Contact the admin to get trips assigned.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={trip.image_url}
                    alt={trip.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{trip.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{trip.destination}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Dates:</strong> {trip.dates}</p>
                    <p><strong>Price:</strong> {trip.price}</p>
                    <p><strong>Group Size:</strong> {trip.group_size}</p>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => setEditingTrip({ ...trip })}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Trip
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Trip: {editingTrip?.title}</DialogTitle>
                      </DialogHeader>
                      
                      {editingTrip && (
                        <div className="space-y-6">
                          {/* Basic Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="title">Title</Label>
                              <Input
                                id="title"
                                value={editingTrip.title}
                                onChange={(e) => setEditingTrip({...editingTrip, title: e.target.value})}
                                disabled={!canEdit(editingTrip.id, 'title')}
                              />
                              {!canEdit(editingTrip.id, 'title') && (
                                <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                              )}
                            </div>
                            
                            <div>
                              <Label htmlFor="destination">Destination</Label>
                              <Input
                                id="destination"
                                value={editingTrip.destination}
                                onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                                disabled={!canEdit(editingTrip.id, 'destination')}
                              />
                              {!canEdit(editingTrip.id, 'destination') && (
                                <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={editingTrip.description}
                              onChange={(e) => setEditingTrip({...editingTrip, description: e.target.value})}
                              disabled={!canEdit(editingTrip.id, 'description')}
                              rows={4}
                            />
                            {!canEdit(editingTrip.id, 'description') && (
                              <p className="text-xs text-muted-foreground mt-1">No permission to edit</p>
                            )}
                          </div>

                          {/* Program */}
                          {canEdit(editingTrip.id, 'program') && (
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <Label>Daily Program</Label>
                                <Button onClick={addProgramDay} variant="outline" size="sm">
                                  Add Day
                                </Button>
                              </div>
                              <div className="space-y-4">
                                {editingTrip.program.map((day: ProgramDay, dayIndex: number) => (
                                  <Card key={dayIndex}>
                                    <CardContent className="pt-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <Label>Day {day.day}</Label>
                                        </div>
                                        <div>
                                          <Label>Location</Label>
                                          <Input
                                            value={day.location}
                                            onChange={(e) => updateProgramDay(dayIndex, 'location', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <Label>Activities</Label>
                                          <Button onClick={() => addActivity(dayIndex)} variant="outline" size="sm">
                                            Add Activity
                                          </Button>
                                        </div>
                                        <div className="space-y-2">
                                          {day.activities.map((activity: string, activityIndex: number) => (
                                            <Input
                                              key={activityIndex}
                                              value={activity}
                                              onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                                              placeholder={`Activity ${activityIndex + 1}`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Arrays */}
                          {canEdit(editingTrip.id, 'included_amenities') && (
                            <div>
                              <Label>Included Amenities (comma-separated)</Label>
                              <Textarea
                                value={editingTrip.included_amenities.join(', ')}
                                onChange={(e) => setEditingTrip({
                                  ...editingTrip, 
                                  included_amenities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setEditingTrip(null)}>
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                            <Button onClick={handleSaveTrip}>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
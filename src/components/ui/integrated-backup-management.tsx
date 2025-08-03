import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Clock, CheckCircle, X, AlertTriangle, Star, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { Textarea } from "./textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface BackupRequest {
  id: string;
  trip_id: string;
  sensei_id: string;
  request_type: string;
  match_score: number;
  status: string;
  requested_at: string;
  response_deadline: string;
  responded_at?: string;
  response_reason?: string;
  trips: {
    title: string;
    theme: string;
    dates: string;
    destination: string;
    description: string;
    duration_days: number;
    difficulty_level: string;
    price: string;
  };
}

interface Trip {
  id: string;
  title: string;
  theme: string;
  dates: string;
  destination: string;
  description: string;
  duration_days: number;
  difficulty_level: string;
  price: string;
  requires_backup_sensei: boolean;
  backup_sensei_id?: string;
}

interface BackupApplication {
  id: string;
  trip_id: string;
  sensei_id: string;
  status: string;
  applied_at: string;
  trips: {
    title: string;
    theme: string;
    dates: string;
    destination: string;
  };
}

interface IntegratedBackupManagementProps {
  isAdmin?: boolean;
}

export function IntegratedBackupManagement({ isAdmin = false }: IntegratedBackupManagementProps) {
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [applications, setApplications] = useState<BackupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BackupRequest | null>(null);
  const [responseReason, setResponseReason] = useState("");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (isAdmin) {
        await fetchAdminData();
      } else {
        await fetchSenseiData();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load backup data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    // Fetch all backup requests for admin
    const { data: requestsData, error: requestsError } = await supabase
      .from('backup_sensei_requests')
      .select(`
        *,
        trips:trip_id (
          title, theme, dates, destination, description, 
          duration_days, difficulty_level, price
        )
      `)
      .order('requested_at', { ascending: false });

    if (requestsError) throw requestsError;
    setRequests(requestsData || []);

    // Fetch all trips that need backup
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null)
      .eq('is_active', true);

    if (tripsError) throw tripsError;
    setAvailableTrips(tripsData || []);

    // Fetch all backup applications
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('backup_sensei_applications')
      .select(`
        *,
        trips:trip_id (title, theme, dates, destination)
      `)
      .order('applied_at', { ascending: false });

    if (applicationsError) throw applicationsError;
    setApplications(applicationsData || []);
  };

  const fetchSenseiData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get sensei profile
    const { data: senseiProfile } = await supabase
      .from('sensei_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!senseiProfile) return;

    // Fetch backup requests for this sensei
    const { data: requestsData, error: requestsError } = await supabase
      .from('backup_sensei_requests')
      .select(`
        *,
        trips:trip_id (
          title, theme, dates, destination, description, 
          duration_days, difficulty_level, price
        )
      `)
      .eq('sensei_id', senseiProfile.id)
      .order('requested_at', { ascending: false });

    if (requestsError) throw requestsError;
    setRequests(requestsData || []);

    // Fetch available trips for backup applications
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('requires_backup_sensei', true)
      .is('backup_sensei_id', null)
      .eq('is_active', true);

    if (tripsError) throw tripsError;
    setAvailableTrips(tripsData || []);

    // Fetch this sensei's backup applications
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('backup_sensei_applications')
      .select(`
        *,
        trips:trip_id (title, theme, dates, destination)
      `)
      .eq('sensei_id', senseiProfile.id)
      .order('applied_at', { ascending: false });

    if (applicationsError) throw applicationsError;
    setApplications(applicationsData || []);
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('backup_sensei_requests')
        .update({
          status,
          responded_at: new Date().toISOString(),
          response_reason: responseReason
        })
        .eq('id', requestId);

      if (error) throw error;

      if (status === 'accepted') {
        // Update trip with backup sensei
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from('trips')
            .update({ backup_sensei_id: request.sensei_id })
            .eq('id', request.trip_id);
        }
      }

      toast({
        title: "Success",
        description: `Request ${status} successfully`,
      });

      setSelectedRequest(null);
      setResponseReason("");
      fetchData();
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to request",
        variant: "destructive",
      });
    }
  };

  const applyForBackup = async (tripId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      const { error } = await supabase
        .from('backup_sensei_applications')
        .insert({
          trip_id: tripId,
          sensei_id: senseiProfile.id,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application submitted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error applying for backup:', error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <X className="h-4 w-4" />;
      case 'expired': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Backup Requests</TabsTrigger>
          <TabsTrigger value="available">Available Trips</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">
              {isAdmin ? 'All Backup Requests' : 'Your Backup Requests'}
            </h3>
            {requests.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isAdmin ? 'No backup requests found.' : 'You have no backup requests at the moment.'}
                </AlertDescription>
              </Alert>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.trips.title}</CardTitle>
                        <CardDescription>{request.trips.theme} • {request.trips.dates}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{request.trips.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Match Score: {request.match_score}%</span>
                        <span>Duration: {request.trips.duration_days} days</span>
                        <span>Difficulty: {request.trips.difficulty_level}</span>
                      </div>
                      {request.status === 'pending' && !isAdmin && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setRespondingTo('accepted');
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setRespondingTo('declined');
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Available Trips for Backup</h3>
            {availableTrips.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No trips currently need backup senseis.
                </AlertDescription>
              </Alert>
            ) : (
              availableTrips.map((trip) => (
                <Card key={trip.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{trip.title}</CardTitle>
                    <CardDescription>{trip.theme} • {trip.dates}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{trip.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Duration: {trip.duration_days} days</span>
                        <span>Difficulty: {trip.difficulty_level}</span>
                        <span>Price: {trip.price}</span>
                      </div>
                      {!isAdmin && (
                        <Button
                          size="sm"
                          onClick={() => applyForBackup(trip.id)}
                          className="mt-2"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Apply for Backup
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">
              {isAdmin ? 'All Applications' : 'Your Applications'}
            </h3>
            {applications.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isAdmin ? 'No backup applications found.' : 'You have not applied for any backup positions.'}
                </AlertDescription>
              </Alert>
            ) : (
              applications.map((application) => (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{application.trips.title}</CardTitle>
                        <CardDescription>{application.trips.theme} • {application.trips.dates}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(application.status)}>
                        {getStatusIcon(application.status)}
                        {application.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Applied on {new Date(application.applied_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {respondingTo === 'accepted' ? 'Accept' : 'Decline'} Backup Request
            </DialogTitle>
            <DialogDescription>
              Trip: {selectedRequest?.trips.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional reason for your response..."
              value={responseReason}
              onChange={(e) => setResponseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest && respondingTo) {
                  respondToRequest(selectedRequest.id, respondingTo as 'accepted' | 'declined');
                }
              }}
            >
              {respondingTo === 'accepted' ? 'Accept' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
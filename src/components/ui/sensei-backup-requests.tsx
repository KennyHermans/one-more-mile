import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Clock, CheckCircle, X, AlertTriangle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { Textarea } from "./textarea";
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

export function SenseiBackupRequests() {
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BackupRequest | null>(null);
  const [responseReason, setResponseReason] = useState("");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Get current user's sensei profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      // Fetch backup requests for this sensei
      const { data: requestsData, error } = await supabase
        .from('backup_sensei_requests')
        .select(`
          *,
          trips(
            title, theme, dates, destination, description,
            duration_days, difficulty_level, price
          )
        `)
        .eq('sensei_id', senseiProfile.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      setRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching backup requests:', error);
      toast({
        title: "Error",
        description: "Failed to load backup requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      setRespondingTo(requestId);

      const { error } = await supabase
        .from('backup_sensei_requests')
        .update({
          status,
          responded_at: new Date().toISOString(),
          response_reason: responseReason
        })
        .eq('id', requestId);

      if (error) throw error;

      // If accepted, update the trip's backup sensei
      if (status === 'accepted') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: senseiProfile } = await supabase
            .from('sensei_profiles')
            .select('id')
            .eq('user_id', user?.id)
            .single();

          if (senseiProfile) {
            await supabase
              .from('trips')
              .update({ backup_sensei_id: senseiProfile.id })
              .eq('id', request.trip_id);
          }
        }
      }

      toast({
        title: "Success",
        description: `Request ${status} successfully`,
      });

      setSelectedRequest(null);
      setResponseReason("");
      fetchRequests();
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Error",
        description: `Failed to ${status} request`,
        variant: "destructive",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      case 'expired': return 'outline';
      default: return 'outline';
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

  const isExpired = (deadline: string) => new Date(deadline) < new Date();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending' && !isExpired(r.response_deadline));
  const expiredRequests = requests.filter(r => r.status === 'pending' && isExpired(r.response_deadline));
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Backup Requests
            </CardTitle>
            <CardDescription>
              Requests awaiting your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.trips.title}</h4>
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          {request.match_score}% match
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <span className="font-medium">Theme:</span> {request.trips.theme}
                        </div>
                        <div>
                          <span className="font-medium">Dates:</span> {request.trips.dates}
                        </div>
                        <div>
                          <span className="font-medium">Destination:</span> {request.trips.destination}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {request.trips.duration_days} days
                        </div>
                        <div>
                          <span className="font-medium">Difficulty:</span> {request.trips.difficulty_level}
                        </div>
                        <div>
                          <span className="font-medium">Price:</span> {request.trips.price}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {request.trips.description}
                      </p>
                      
                      <div className="text-xs text-muted-foreground">
                        <div>Requested: {new Date(request.requested_at).toLocaleString()}</div>
                        <div className="text-amber-600 font-medium">
                          Deadline: {new Date(request.response_deadline).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedRequest(request)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setResponseReason("");
                      }}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired Requests */}
      {expiredRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Expired Requests
            </CardTitle>
            <CardDescription>
              Requests that have passed their deadline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div>
                    <h4 className="font-medium text-sm">{request.trips.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Expired: {new Date(request.response_deadline).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive">Expired</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Responses */}
      {respondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Previous Responses
            </CardTitle>
            <CardDescription>
              Your response history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {respondedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{request.trips.title}</h4>
                      <Badge variant={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Responded: {request.responded_at ? new Date(request.responded_at).toLocaleString() : 'N/A'}
                    </p>
                    {request.response_reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        "{request.response_reason}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Requests */}
      {requests.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No backup requests yet. You'll be notified when matching opportunities become available.
          </AlertDescription>
        </Alert>
      )}

      {/* Response Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Backup Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.trips.title} - ${selectedRequest.trips.dates}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Response reason (optional)</label>
              <Textarea
                placeholder="Add any additional comments about your response..."
                value={responseReason}
                onChange={(e) => setResponseReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={!!respondingTo}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRequest && respondToRequest(selectedRequest.id, 'declined')}
              disabled={!!respondingTo}
            >
              {respondingTo === selectedRequest?.id ? 'Declining...' : 'Decline'}
            </Button>
            <Button
              onClick={() => selectedRequest && respondToRequest(selectedRequest.id, 'accepted')}
              disabled={!!respondingTo}
            >
              {respondingTo === selectedRequest?.id ? 'Accepting...' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
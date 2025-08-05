import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Textarea } from "./textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Eye, User, Calendar } from "lucide-react";

interface TripCreationRequest {
  id: string;
  sensei_id: string;
  user_id: string;
  request_reason: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  sensei_profiles?: {
    name: string;
    sensei_level: string;
    trips_led: number;
    rating: number;
  } | null;
}

export function AdminTripCreationRequests() {
  const [requests, setRequests] = useState<TripCreationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TripCreationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trip_creation_requests')
        .select(`
          *,
          sensei_profiles (
            name,
            sensei_level,
            trips_led,
            rating
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching trip creation requests:', error);
      toast.error('Failed to load trip creation requests');
    } finally {
      setIsLoading(false);
    }
  };

  const reviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc('review_trip_creation_request', {
        p_request_id: requestId,
        p_status: status,
        p_review_notes: reviewNotes
      });

      if (error) throw error;

      toast.success(`Request ${status} successfully`);
      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error(`Failed to ${status} request`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading trip creation requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trip Creation Requests</CardTitle>
          <CardDescription>
            Review and approve requests from senseis to create their own trips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-amber-700">
                Pending Requests ({pendingRequests.length})
              </h3>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span className="font-semibold">{request.sensei_profiles?.name || 'Unknown'}</span>
                          <Badge variant="outline">{request.sensei_profiles?.sensei_level || 'Unknown'}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {request.sensei_profiles?.trips_led || 0} trips led • {request.sensei_profiles?.rating || 0} rating
                        </div>
                        {request.request_reason && (
                          <div className="text-sm">
                            <strong>Reason:</strong> {request.request_reason}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trip creation requests found.
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">All Requests</h3>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{request.sensei_profiles?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`flex items-center gap-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      {request.status === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Trip Creation Request</DialogTitle>
              <DialogDescription>
                Review {selectedRequest.sensei_profiles?.name || 'Unknown'}'s request to create trips
              </DialogDescription>
            </DialogHeader>
            
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Sensei Name</label>
                    <div className="text-sm">{selectedRequest.sensei_profiles?.name || 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Level</label>
                    <div className="text-sm">{selectedRequest.sensei_profiles?.sensei_level || 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trips Led</label>
                    <div className="text-sm">{selectedRequest.sensei_profiles?.trips_led || 0}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rating</label>
                    <div className="text-sm">{selectedRequest.sensei_profiles?.rating || 0}</div>
                  </div>
                </div>
              
              {selectedRequest.request_reason && (
                <div>
                  <label className="text-sm font-medium">Request Reason</label>
                  <div className="text-sm p-3 bg-muted rounded-lg">
                    {selectedRequest.request_reason}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Review Notes (Optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => reviewRequest(selectedRequest.id, 'approved')}
                  disabled={processing === selectedRequest.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve Request
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => reviewRequest(selectedRequest.id, 'rejected')}
                  disabled={processing === selectedRequest.id}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
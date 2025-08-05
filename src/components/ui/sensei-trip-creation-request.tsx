import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Textarea } from "./textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, AlertCircle } from "lucide-react";

interface SenseiTripCreationRequestProps {
  senseiId: string;
  canCreateTrips: boolean;
  hasRequestPending: boolean;
  onRequestSubmitted: () => void;
}

export function SenseiTripCreationRequest({ 
  senseiId, 
  canCreateTrips, 
  hasRequestPending,
  onRequestSubmitted 
}: SenseiTripCreationRequestProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const submitRequest = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_trip_creation_permission', {
        p_sensei_id: senseiId,
        p_reason: reason.trim()
      });

      if (error) throw error;

      // Handle the JSON response from the improved function
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const response = data as { success?: boolean; message?: string; error?: string };
        if (response.success) {
          toast.success(response.message || "Trip creation request submitted successfully!");
          setReason("");
          setDialogOpen(false);
          onRequestSubmitted();
        } else {
          toast.error(response.error || "Failed to submit request");
        }
      } else {
        // Fallback for old response format
        toast.success("Trip creation request submitted successfully!");
        setReason("");
        setDialogOpen(false);
        onRequestSubmitted();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (canCreateTrips) {
    return null; // Don't show if already has permission
  }

  if (hasRequestPending) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800">Trip Creation Request Pending</h3>
              <p className="text-sm text-amber-700">
                Your request to create trips is under admin review. You'll be notified once it's processed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Request Trip Creation Permission
        </CardTitle>
        <CardDescription>
          As a sensei, you can request permission to create your own trips. This requires admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Requirements for trip creation:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Demonstrate leadership and organizational skills</li>
                <li>Show commitment to quality travel experiences</li>
                <li>Maintain high ratings from previous trip participation</li>
              </ul>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Request Permission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Trip Creation Permission</DialogTitle>
                <DialogDescription>
                  Tell us why you'd like to create trips and how you plan to use this permission.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Why do you want to create trips? *
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain your motivation, experience, and how you plan to contribute to the platform..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={submitRequest}
                    disabled={isSubmitting || !reason.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
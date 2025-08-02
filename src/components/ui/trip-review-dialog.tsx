import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TripReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    id: string;
    title: string;
    sensei_name: string;
    sensei_id: string;
  };
  onSuccess?: () => void;
}

export function TripReviewDialog({ open, onOpenChange, trip, onSuccess }: TripReviewDialogProps) {
  const [publicRating, setPublicRating] = useState(0);
  const [publicReview, setPublicReview] = useState("");
  const [privateRating, setPrivateRating] = useState(0);
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStarClick = (rating: number, isPrivate: boolean) => {
    if (isPrivate) {
      setPrivateRating(rating);
    } else {
      setPublicRating(rating);
    }
  };

  const renderStars = (currentRating: number, onStarClick: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              star <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
            onClick={() => onStarClick(star)}
          />
        ))}
      </div>
    );
  };

  const handleSubmit = async () => {
    if (publicRating === 0 || privateRating === 0) {
      toast({
        title: "Missing Ratings",
        description: "Please provide both public and private ratings.",
        variant: "destructive",
      });
      return;
    }

    if (!privateFeedback.trim()) {
      toast({
        title: "Missing Private Feedback",
        description: "Please provide private feedback for the admin.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Submit public review
      const { error: reviewError } = await supabase
        .from('trip_reviews')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          sensei_id: trip.sensei_id,
          rating: publicRating,
          review_text: publicReview || null,
        });

      if (reviewError) throw reviewError;

      // Submit private feedback
      const { error: feedbackError } = await supabase
        .from('sensei_feedback')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          sensei_id: trip.sensei_id,
          rating: privateRating,
          feedback_text: privateFeedback,
        });

      if (feedbackError) throw feedbackError;

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback! Your review has been submitted successfully.",
      });

      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setPublicRating(0);
      setPublicReview("");
      setPrivateRating(0);
      setPrivateFeedback("");

    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Your Experience</DialogTitle>
          <DialogDescription>
            Share your thoughts about "{trip.title}" with Sensei {trip.sensei_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Public Review
              </CardTitle>
              <CardDescription>
                This review will be visible to other travelers considering this Sensei
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rating *</label>
                {renderStars(publicRating, (rating) => handleStarClick(rating, false))}
              </div>
              
              <div>
                <label className="text-sm font-medium">Review (Optional)</label>
                <Textarea
                  placeholder="Share your experience with other travelers..."
                  value={publicReview}
                  onChange={(e) => setPublicReview(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Private Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Private Feedback for Admin
              </CardTitle>
              <CardDescription>
                This feedback is confidential and will only be seen by our admin team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rating *</label>
                {renderStars(privateRating, (rating) => handleStarClick(rating, true))}
              </div>
              
              <div>
                <label className="text-sm font-medium">Detailed Feedback *</label>
                <Textarea
                  placeholder="Please provide honest feedback about the Sensei's performance, professionalism, and overall experience. This helps us maintain quality standards."
                  value={privateFeedback}
                  onChange={(e) => setPrivateFeedback(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { AlertCircle, Users, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RealTimeAvailabilityProps {
  tripId: string;
  currentParticipants: number;
  maxParticipants: number;
  className?: string;
  showProgress?: boolean;
  showUrgency?: boolean;
}

export function RealTimeAvailability({ 
  tripId, 
  currentParticipants, 
  maxParticipants, 
  className,
  showProgress = true,
  showUrgency = true
}: RealTimeAvailabilityProps) {
  const [participants, setParticipants] = useState(currentParticipants);
  const [recentBookings, setRecentBookings] = useState<number>(0);

  useEffect(() => {
    // Subscribe to real-time updates for this trip's bookings
    const channel = supabase
      .channel(`trip_${tripId}_bookings`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_bookings',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          // Refetch current participants count
          fetchCurrentParticipants();
          
          // Track recent bookings for urgency indicators
          if (payload.eventType === 'INSERT') {
            setRecentBookings(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    // Reset recent bookings counter after 30 seconds
    if (recentBookings > 0) {
      const timer = setTimeout(() => {
        setRecentBookings(0);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [recentBookings]);

  const fetchCurrentParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('current_participants')
        .eq('id', tripId)
        .single();
      
      if (error) throw error;
      if (data) {
        setParticipants(data.current_participants);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const availabilityPercentage = (participants / maxParticipants) * 100;
  const spotsLeft = maxParticipants - participants;
  
  const getAvailabilityStatus = () => {
    if (availabilityPercentage >= 100) {
      return {
        status: "full",
        label: "Fully Booked",
        color: "destructive",
        urgency: "high"
      };
    } else if (availabilityPercentage >= 90) {
      return {
        status: "critical",
        label: `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`,
        color: "destructive",
        urgency: "high"
      };
    } else if (availabilityPercentage >= 75) {
      return {
        status: "low",
        label: "Filling Fast",
        color: "warning",
        urgency: "medium"
      };
    } else if (availabilityPercentage >= 50) {
      return {
        status: "medium",
        label: "Half Full",
        color: "secondary",
        urgency: "low"
      };
    } else {
      return {
        status: "available",
        label: "Available",
        color: "secondary",
        urgency: "none"
      };
    }
  };

  const status = getAvailabilityStatus();

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Main Status Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={status.color as any} 
            className="flex items-center gap-1"
          >
            <Users className="h-3 w-3" />
            {status.label}
          </Badge>
          
          {/* Real-time indicators */}
          {showUrgency && recentBookings > 0 && (
            <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {recentBookings} booked recently
            </Badge>
          )}
          
          {showUrgency && status.urgency === "high" && (
            <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              High Demand
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-1">
            <Progress 
              value={availabilityPercentage} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{participants} booked</span>
              <span>{maxParticipants} max</span>
            </div>
          </div>
        )}

        {/* Urgency Messages */}
        {showUrgency && status.urgency === "high" && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <Clock className="h-3 w-3" />
            <span>Book soon to secure your spot</span>
          </div>
        )}
        
        {showUrgency && status.urgency === "medium" && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <Clock className="h-3 w-3" />
            <span>Popular trip - consider booking early</span>
          </div>
        )}
      </div>
    </div>
  );
}
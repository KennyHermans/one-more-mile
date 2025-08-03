import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { Separator } from "./separator";
import { 
  CheckCircle, 
  Circle, 
  Calendar, 
  MapPin, 
  Plane, 
  Camera, 
  FileText, 
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TripMilestone {
  id: string;
  title: string;
  description: string;
  type: 'booking' | 'preparation' | 'travel' | 'completion';
  status: 'completed' | 'current' | 'upcoming';
  dueDate?: Date;
  isOptional?: boolean;
  tripId: string;
}

interface TripTimelineVisualizationProps {
  tripBookings: any[];
  className?: string;
}

export function TripTimelineVisualization({ tripBookings, className }: TripTimelineVisualizationProps) {
  const [milestones, setMilestones] = useState<TripMilestone[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  useEffect(() => {
    if (tripBookings.length > 0) {
      setSelectedTrip(tripBookings[0].id);
    }
  }, [tripBookings]);

  useEffect(() => {
    if (selectedTrip) {
      generateMilestones(selectedTrip);
    }
  }, [selectedTrip]);

  const generateMilestones = (tripBookingId: string) => {
    const booking = tripBookings.find(b => b.id === tripBookingId);
    if (!booking) return;

    // Generate timeline based on trip booking
    const now = new Date();
    const bookingDate = new Date(booking.booking_date);
    const tripStartDate = new Date(); // This would come from trip.dates parsing
    
    const generatedMilestones: TripMilestone[] = [
      {
        id: '1',
        title: 'Trip Booked',
        description: 'Your adventure is confirmed!',
        type: 'booking',
        status: 'completed',
        tripId: tripBookingId
      },
      {
        id: '2',
        title: 'Payment Completed',
        description: `$${booking.total_amount} paid successfully`,
        type: 'booking',
        status: booking.payment_status === 'paid' ? 'completed' : 'current',
        tripId: tripBookingId
      },
      {
        id: '3',
        title: 'Documents Required',
        description: 'Upload passport, insurance, and health forms',
        type: 'preparation',
        status: 'current',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        tripId: tripBookingId
      },
      {
        id: '4',
        title: 'Pre-trip Briefing',
        description: 'Virtual meeting with your Sensei',
        type: 'preparation',
        status: 'upcoming',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        tripId: tripBookingId
      },
      {
        id: '5',
        title: 'Pack & Prepare',
        description: 'Follow your personalized packing checklist',
        type: 'preparation',
        status: 'upcoming',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        tripId: tripBookingId
      },
      {
        id: '6',
        title: 'Departure Day',
        description: `Begin your ${booking.trips?.destination} adventure!`,
        type: 'travel',
        status: 'upcoming',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        tripId: tripBookingId
      },
      {
        id: '7',
        title: 'Trip Completion',
        description: 'Share your experience and memories',
        type: 'completion',
        status: 'upcoming',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        tripId: tripBookingId
      }
    ];

    setMilestones(generatedMilestones);
  };

  const getMilestoneIcon = (milestone: TripMilestone) => {
    switch (milestone.type) {
      case 'booking':
        return milestone.status === 'completed' ? CheckCircle : Circle;
      case 'preparation':
        return FileText;
      case 'travel':
        return Plane;
      case 'completion':
        return Camera;
      default:
        return Circle;
    }
  };

  const getMilestoneColor = (milestone: TripMilestone) => {
    switch (milestone.status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'current':
        return 'text-blue-600 bg-blue-100';
      case 'upcoming':
        return 'text-gray-500 bg-gray-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index === 0) return '';
    const prevMilestone = milestones[index - 1];
    return prevMilestone.status === 'completed' ? 'bg-green-300' : 'bg-gray-300';
  };

  const getOverallProgress = () => {
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / milestones.length) * 100;
  };

  const getUpcomingTasks = () => {
    return milestones
      .filter(m => m.status === 'current' || (m.status === 'upcoming' && m.dueDate))
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, 3);
  };

  if (tripBookings.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                No Active Trips
              </h3>
              <p className="text-muted-foreground">
                Book your first adventure to see your trip timeline here.
              </p>
            </div>
            <Button asChild>
              <a href="/explore">Explore Trips</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedBooking = tripBookings.find(b => b.id === selectedTrip);

  return (
    <div className={className}>
      {/* Trip Selector */}
      {tripBookings.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-serif">Select Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tripBookings.map((booking) => (
                <Button
                  key={booking.id}
                  variant={selectedTrip === booking.id ? "default" : "outline"}
                  onClick={() => setSelectedTrip(booking.id)}
                  className="h-auto p-4 text-left justify-start"
                >
                  <div>
                    <p className="font-semibold">{booking.trips?.title}</p>
                    <p className="text-sm opacity-80">{booking.trips?.destination}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Trip Timeline
              </CardTitle>
              <CardDescription>
                {selectedBooking?.trips?.title} • {selectedBooking?.trips?.destination}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Overview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {milestones.filter(m => m.status === 'completed').length} of {milestones.length} completed
                  </span>
                </div>
                <Progress value={getOverallProgress()} className="h-2" />
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {milestones.map((milestone, index) => {
                  const Icon = getMilestoneIcon(milestone);
                  return (
                    <div key={milestone.id} className="relative">
                      {/* Connector Line */}
                      {index < milestones.length - 1 && (
                        <div 
                          className={cn(
                            "absolute left-6 top-12 w-0.5 h-6 -translate-x-1/2",
                            getConnectorColor(index + 1)
                          )}
                        />
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center border-2 border-background",
                          getMilestoneColor(milestone)
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{milestone.title}</h4>
                            {milestone.status === 'current' && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {milestone.description}
                          </p>
                          {milestone.dueDate && milestone.status !== 'completed' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Due: {milestone.dueDate.toLocaleDateString()}
                              {milestone.dueDate < new Date() && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{selectedBooking?.trips?.destination}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking?.trips?.dates}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Sensei {selectedBooking?.trips?.sensei_name}</p>
                  <p className="text-sm text-muted-foreground">Your guide</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge variant={selectedBooking?.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {selectedBooking?.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getUpcomingTasks().map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs",
                      task.status === 'current' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {task.status === 'current' ? '!' : '◦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Due {task.dueDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {getUpcomingTasks().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All caught up! 🎉
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
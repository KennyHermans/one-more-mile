import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MapPin, 
  Calendar,
  Users,
  DollarSign,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Edit2
} from "lucide-react";
import { Trip, ProgramDay } from '@/types/trip';

interface SenseiTripDetailViewProps {
  trip: Trip;
  onBack: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function SenseiTripDetailView({ 
  trip, 
  onBack, 
  onEdit, 
  canEdit = false 
}: SenseiTripDetailViewProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Edit2 className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderProgramDay = (day: ProgramDay, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm">
            {index + 1}
          </span>
          {day.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {day.description && (
          <p className="text-muted-foreground mb-3">{day.description}</p>
        )}
        {day.activities && day.activities.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Activities:</h5>
            <ul className="space-y-1">
              {day.activities.map((activity, activityIndex) => (
                <li key={activityIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        )}
        {day.location && (
          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {day.location}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(trip.trip_status)}
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">Trip ID: {trip.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        {canEdit && trip.trip_status !== 'completed' && onEdit && (
          <Button onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Trip
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Destination</p>
                    <p className="text-sm text-muted-foreground">{trip.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Dates</p>
                    <p className="text-sm text-muted-foreground">{trip.dates}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Group Size</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.current_participants}/{trip.max_participants} participants
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-muted-foreground">${trip.price}</p>
                  </div>
                </div>
              </div>
              
              {trip.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">{trip.description}</p>
                  </div>
                </>
              )}

              {trip.theme && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Theme</h4>
                    <Badge variant="outline">{trip.theme}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Day-by-Day Program */}
          {trip.program && trip.program.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Day-by-Day Program</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {trip.program.map((day, index) => renderProgramDay(day, index))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(trip.trip_status)}
                </div>
                
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trip.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trip.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {trip.difficulty_level && (
                  <div>
                    <p className="text-sm font-medium">Difficulty</p>
                    <Badge variant="outline">{trip.difficulty_level}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* What's Included */}
          {trip.included_amenities && trip.included_amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  What's Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {trip.included_amenities.map((item, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* What's Not Included */}
          {trip.excluded_items && trip.excluded_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Not Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {trip.excluded_items.map((item, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {trip.requirements && trip.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {trip.requirements.map((requirement, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      {requirement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Booking Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Available Spots</span>
                <span className="text-sm font-medium">
                  {trip.max_participants - trip.current_participants}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Occupancy Rate</span>
                <span className="text-sm font-medium">
                  {Math.round((trip.current_participants / trip.max_participants) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(trip.current_participants / trip.max_participants) * 100}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
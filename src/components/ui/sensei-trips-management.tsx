import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Users, 
  Calendar,
  Eye,
  Edit2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Trip, TripListItem } from '@/types/trip';
import { SenseiTripDetailView } from './sensei-trip-detail-view';

interface SenseiTripsManagementProps {
  trips: Trip[];
  canCreateTrips: boolean;
  canEditTrips: boolean;
  onCreateTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onViewTrip: (trip: Trip) => void;
  onCancelTrip: (trip: Trip) => void;
}

export function SenseiTripsManagement({ 
  trips, 
  canCreateTrips,
  canEditTrips,
  onCreateTrip,
  onEditTrip,
  onViewTrip,
  onCancelTrip 
}: SenseiTripsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);

  const activeTrips = trips.filter(trip => 
    trip.is_active && 
    trip.trip_status === 'approved' &&
    trip.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completedTrips = trips.filter(trip => 
    trip.trip_status === 'completed' &&
    trip.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const draftTrips = trips.filter(trip => 
    (trip.trip_status === 'draft' || trip.trip_status === 'pending') &&
    trip.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending Review</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TripCard = ({ trip }: { trip: Trip }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{trip.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.destination}
              </p>
            </div>
            {getStatusBadge(trip.trip_status)}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{trip.dates}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{trip.current_participants}/{trip.max_participants}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-primary">${trip.price}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewingTrip(trip)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              {trip.trip_status !== 'completed' && canEditTrips && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditTrip(trip)}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show detailed trip view if viewing a trip
  if (viewingTrip) {
    return (
      <SenseiTripDetailView
        trip={viewingTrip}
        onBack={() => setViewingTrip(null)}
        onEdit={() => {
          setViewingTrip(null);
          onEditTrip(viewingTrip);
        }}
        canEdit={canEditTrips && viewingTrip.trip_status !== 'completed'}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Trips</h2>
          <p className="text-muted-foreground">Manage your adventures and track performance</p>
        </div>
        {canCreateTrips && (
          <Button onClick={onCreateTrip}>
            <Plus className="h-4 w-4 mr-2" />
            Create Trip
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active ({activeTrips.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Drafts & Pending ({draftTrips.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Completed ({completedTrips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTrips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Trips</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any active trips yet.
                </p>
                {canCreateTrips && (
                  <Button onClick={onCreateTrip}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trip
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftTrips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Draft Trips</h3>
                <p className="text-muted-foreground">
                  No trips in draft or pending review status.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTrips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Trips</h3>
                <p className="text-muted-foreground">
                  Your completed trips will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
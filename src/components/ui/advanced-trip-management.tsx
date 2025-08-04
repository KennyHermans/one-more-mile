import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  Copy,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  Search,
  Filter,
  Clock as Timeline,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TripMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue';
  assignee?: string;
  dependencies?: string[];
}

interface TripConflict {
  id: string;
  type: 'date_overlap' | 'sensei_double_booking' | 'location_conflict';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedTrips: string[];
  suggestedAction: string;
}

interface PricingSuggestion {
  currentPrice: number;
  suggestedPrice: number;
  confidence: number;
  reasoning: string;
  factors: Array<{ name: string; impact: number; description: string }>;
}

import { Trip } from '@/types/trip';
import { transformToTripArray } from '@/types/trip-utils';

interface ExtendedTrip extends Trip {
  milestones: TripMilestone[];
  bookingTrend: number[];
  seasonality: 'high' | 'medium' | 'low';
}

export function AdvancedTripManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTrip, setSelectedTrip] = useState<ExtendedTrip | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showPricingSuggestions, setShowPricingSuggestions] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [trips, setTrips] = useState<ExtendedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedTrips: ExtendedTrip[] = transformToTripArray(data || []).map(trip => ({
        ...trip,
        bookingTrend: [0, 1, 2, trip.current_participants || 0],
        seasonality: 'medium' as const,
        milestones: [
          {
            id: `${trip.id}_m1`,
            title: "Final payment deadline",
            description: "Collect remaining payments from participants",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'pending' as const
          },
          {
            id: `${trip.id}_m2`, 
            title: "Pre-trip preparation",
            description: "Verify equipment and logistics",
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'pending' as const
          }
        ]
      }));

      setTrips(transformedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data for conflicts and pricing suggestions
  const conflicts: TripConflict[] = trips.reduce((acc, trip, index) => {
    // Check for date overlaps and sensei conflicts
    const otherTrips = trips.filter((_, i) => i !== index);
    const overlaps = otherTrips.filter(other => 
      other.sensei_name === trip.sensei_name && other.trip_status === 'approved'
    );

    if (overlaps.length > 0) {
      acc.push({
        id: `conflict_${trip.id}`,
        type: "sensei_double_booking",
        severity: "high",
        message: `${trip.sensei_name} is assigned to multiple active trips`,
        affectedTrips: [trip.id, ...overlaps.map(t => t.id)],
        suggestedAction: "Reassign sensei or adjust dates"
      });
    }

    return acc;
  }, [] as TripConflict[]);

  const pricingSuggestions: Record<string, PricingSuggestion> = {};
  
  // Generate pricing suggestions for trips with low occupancy
  trips.forEach(trip => {
    const occupancyRate = trip.current_participants / trip.max_participants;
    if (occupancyRate < 0.7) {
      const priceNumber = parseFloat(trip.price?.replace(/[^\d.]/g, '') || '0');
      pricingSuggestions[trip.id] = {
        currentPrice: priceNumber,
        suggestedPrice: Math.round(priceNumber * 0.85),
        confidence: 75,
        reasoning: "Low occupancy - consider promotional pricing",
        factors: [
          { name: "Occupancy rate", impact: -15, description: `Only ${Math.round(occupancyRate * 100)}% filled` },
          { name: "Time to departure", impact: -10, description: "Booking window is narrowing" }
        ]
      };
    }
  });

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const matchesSearch = searchQuery === "" || 
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.sensei_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || trip.trip_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const cloneTrip = (trip: ExtendedTrip) => {
    const clonedTrip = {
      ...trip,
      id: Date.now().toString(),
      title: `${trip.title} (Copy)`,
      participants: 0,
      status: 'draft' as const,
      milestones: trip.milestones.map(m => ({
        ...m,
        id: `${m.id}_clone_${Date.now()}`,
        status: 'pending' as const
      }))
    };
    
    // In real app, would save to database
    toast({
      title: "Trip cloned",
      description: `"${clonedTrip.title}" has been created as a draft.`
    });
    setIsCloneDialogOpen(false);
  };

  const applyPricingSuggestion = (tripId: string) => {
    const suggestion = pricingSuggestions[tripId];
    if (suggestion) {
      toast({
        title: "Pricing updated",
        description: `Price updated from €${suggestion.currentPrice} to €${suggestion.suggestedPrice}`
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Advanced Trip Management</h2>
            <p className="text-muted-foreground">Loading trips...</p>
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Trip Management</h2>
          <p className="text-muted-foreground">
            Manage trips with timeline tracking, conflict detection, and smart pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConflicts(true)}
            className={conflicts.length > 0 ? "border-red-500 text-red-600" : ""}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts ({conflicts.length})
          </Button>
          <Button onClick={() => setShowPricingSuggestions(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Pricing Insights
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Timeline className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trips Grid */}
          <div className="grid gap-6">
            {filteredTrips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{trip.title}</h3>
                        <Badge className={getStatusColor(trip.trip_status)}>
                          {trip.trip_status}
                        </Badge>
                        {conflicts.some(c => c.affectedTrips.includes(trip.id)) && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Conflict
                          </Badge>
                        )}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {trip.destination}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {trip.dates}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {trip.current_participants}/{trip.max_participants} participants
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTrip(trip)}
                      >
                        <Timeline className="h-4 w-4 mr-1" />
                        Timeline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTrip(trip);
                          setIsCloneDialogOpen(true);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Clone
                      </Button>
                    </div>
                  </div>

                  {/* Progress and Pricing */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Booking Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((trip.current_participants / trip.max_participants) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(trip.current_participants / trip.max_participants) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-semibold">{trip.price}</span>
                        {pricingSuggestions[trip.id] && (
                          <Badge variant="outline" className="ml-2">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            €{pricingSuggestions[trip.id].suggestedPrice} suggested
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {trip.seasonality} demand
                      </Badge>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Upcoming Milestones</h4>
                    <div className="space-y-2">
                      {trip.milestones.slice(0, 2).map((milestone) => (
                        <div key={milestone.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              milestone.status === 'completed' ? 'bg-green-500' : 
                              milestone.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <span>{milestone.title}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {milestone.dueDate.toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {selectedTrip ? (
            <Card>
              <CardHeader>
                <CardTitle>Trip Timeline - {selectedTrip.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {selectedTrip.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          milestone.status === 'completed' ? 'bg-green-500 border-green-500' :
                          milestone.status === 'overdue' ? 'bg-red-500 border-red-500' :
                          'border-gray-300'
                        }`} />
                        {index < selectedTrip.milestones.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{milestone.title}</h4>
                          <Badge className={getMilestoneStatusColor(milestone.status)}>
                            {milestone.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {milestone.description}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          Due: {milestone.dueDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Timeline className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Trip</h3>
                <p className="text-muted-foreground">
                  Choose a trip from the overview to view its timeline
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <Card key={conflict.id} className={getConflictSeverityColor(conflict.severity)}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h4 className="font-semibold">{conflict.message}</h4>
                        <Badge variant={conflict.severity === 'high' ? 'destructive' : 'secondary'}>
                          {conflict.severity} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Suggested action:</strong> {conflict.suggestedAction}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Affected trips: {conflict.affectedTrips.join(', ')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        Resolve
                      </Button>
                      <Button variant="outline" size="sm">
                        Ignore
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Booking trend analytics will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Revenue Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Revenue optimization insights will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clone Trip Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Trip</DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedTrip?.title}" as a new draft trip.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedTrip && cloneTrip(selectedTrip)}>
              <Copy className="h-4 w-4 mr-2" />
              Clone Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Suggestions Dialog */}
      <Dialog open={showPricingSuggestions} onOpenChange={setShowPricingSuggestions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Pricing Suggestions</DialogTitle>
            <DialogDescription>
              Smart pricing recommendations based on demand, seasonality, and market data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(pricingSuggestions).map(([tripId, suggestion]) => {
              const trip = trips.find(t => t.id === tripId);
              return (
                <Card key={tripId}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{trip?.title}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <span>Current: <strong>€{suggestion.currentPrice}</strong></span>
                          <span>Suggested: <strong className="text-green-600">€{suggestion.suggestedPrice}</strong></span>
                          <Badge variant="outline">{suggestion.confidence}% confidence</Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => applyPricingSuggestion(tripId)}
                      >
                        Apply
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestion.reasoning}
                    </p>
                    <div className="space-y-2">
                      {suggestion.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{factor.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={factor.impact > 0 ? 'text-green-600' : 'text-red-600'}>
                              {factor.impact > 0 ? '+' : ''}{factor.impact}%
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {factor.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
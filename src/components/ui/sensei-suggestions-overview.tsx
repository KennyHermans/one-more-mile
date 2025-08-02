import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  UserPlus, 
  Star,
  MapPin,
  Calendar,
  Users,
  Award,
  FileText,
  AlertCircle,
  CheckCircle,
  Target,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from "lucide-react";

interface Trip {
  id: string;
  title: string;
  destination: string;
  theme: string;
  dates: string;
  trip_status: string;
  sensei_id?: string;
  sensei_name: string;
  max_participants: number;
  current_participants: number;
  backup_sensei_id?: string;
  trip_requirements?: TripRequirement[];
}

interface TripRequirement {
  id: string;
  requirement_type: string;
  requirement_name: string;
  requirement_description?: string;
  is_mandatory: boolean;
  minimum_level?: string;
}

interface SenseiSuggestion {
  sensei_id: string;
  sensei_name: string;
  match_score: number;
  matching_specialties: string[];
  matching_certifications: string[];
  matching_skills: string[];
  verified_certificates: string[];
  missing_requirements: string[];
  location: string;
  rating: number;
  is_available: boolean;
  requirements_met_percentage: number;
}

export function SenseiSuggestionsOverview() {
  const [tripsNeedingSenseis, setTripsNeedingSenseis] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [suggestions, setSuggestions] = useState<SenseiSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTripsNeedingSenseis();
  }, []);

  const fetchTripsNeedingSenseis = async () => {
    try {
      setLoading(true);
      
      // Fetch trips that don't have a sensei or backup sensei assigned
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_requirements (
            id,
            requirement_type,
            requirement_name,
            requirement_description,
            is_mandatory,
            minimum_level
          )
        `)
        .eq('is_active', true)
        .eq('trip_status', 'approved')
        .or('sensei_id.is.null,backup_sensei_id.is.null')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      setTripsNeedingSenseis(trips || []);
    } catch (error) {
      console.error("Error fetching trips needing senseis:", error);
      toast({
        title: "Error",
        description: "Failed to load trips needing senseis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSenseiSuggestions = async (trip: Trip) => {
    try {
      setLoadingSuggestions(true);
      setSelectedTrip(trip);
      
      // Extract months from trip dates (simplified)
      const tripMonths: string[] = [];
      
      const { data, error } = await supabase
        .rpc('suggest_senseis_for_trip_enhanced', {
          trip_theme: trip.theme,
          trip_months: tripMonths,
          trip_id: trip.id
        });

      if (error) throw error;

      setSuggestions(data || []);
      setSuggestionsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching sensei suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to load sensei suggestions",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const assignSenseiToTrip = async (tripId: string, senseiId: string, senseiName: string, isBackup: boolean = false) => {
    try {
      const updateData = isBackup 
        ? { backup_sensei_id: senseiId }
        : { sensei_id: senseiId, sensei_name: senseiName };

      const { error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${isBackup ? 'Backup s' : 'S'}ensei assigned successfully`
      });

      setSuggestionsDialogOpen(false);
      fetchTripsNeedingSenseis();
    } catch (error) {
      console.error("Error assigning sensei:", error);
      toast({
        title: "Error",
        description: "Failed to assign sensei",
        variant: "destructive"
      });
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 15) return "text-green-600";
    if (score >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getMatchScoreBadge = (score: number) => {
    if (score >= 15) return "bg-green-100 text-green-800";
    if (score >= 10) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getRequirementMetBadge = (percentage: number) => {
    if (percentage >= 100) return "bg-green-100 text-green-800";
    if (percentage >= 80) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensei Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading trips needing senseis...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Trips Needing Sensei Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>No Sensei ({tripsNeedingSenseis.filter(t => !t.sensei_id).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>No Backup ({tripsNeedingSenseis.filter(t => !t.backup_sensei_id).length})</span>
              </div>
            </div>
          </div>

          {tripsNeedingSenseis.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">All trips have assigned senseis!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tripsNeedingSenseis.map((trip) => (
                <Card key={trip.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{trip.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
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
                        
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline">{trip.theme}</Badge>
                          {trip.trip_requirements && trip.trip_requirements.length > 0 && (
                            <Badge variant="secondary">
                              {trip.trip_requirements.length} requirements
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          {!trip.sensei_id && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No Primary Sensei
                            </Badge>
                          )}
                          {!trip.backup_sensei_id && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Backup Sensei
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button 
                          onClick={() => fetchSenseiSuggestions(trip)}
                          disabled={loadingSuggestions}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Find Senseis
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensei Suggestions Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sensei Suggestions for "{selectedTrip?.title}"</DialogTitle>
            <DialogDescription>
              Ranked by match score, qualifications, and trip requirements
            </DialogDescription>
          </DialogHeader>
          
          {loadingSuggestions ? (
            <div className="text-center py-8">Loading suggestions...</div>
          ) : (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No suitable senseis found for this trip</p>
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <Card key={suggestion.sensei_id} className={`${index === 0 ? 'ring-2 ring-green-200' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{suggestion.sensei_name}</h4>
                            {index === 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                <Star className="h-3 w-3 mr-1" />
                                Best Match
                              </Badge>
                            )}
                            <Badge className={getMatchScoreBadge(suggestion.match_score)}>
                              Score: {suggestion.match_score}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4" />
                                <span>{suggestion.location}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span>{suggestion.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              {suggestion.requirements_met_percentage < 100 && (
                                <div className="mb-2">
                                  <Badge className={getRequirementMetBadge(suggestion.requirements_met_percentage)}>
                                    {suggestion.requirements_met_percentage.toFixed(0)}% requirements met
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {suggestion.verified_certificates.length > 0 && (
                                <div>
                                  <strong className="text-green-700">Verified Certificates:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.verified_certificates.map((cert, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs border-green-300">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {cert}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {suggestion.matching_skills.length > 0 && (
                                <div>
                                  <strong className="text-blue-700">Matching Skills:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.matching_skills.map((skill, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs border-blue-300">
                                        <Award className="h-3 w-3 mr-1" />
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {suggestion.missing_requirements.length > 0 && (
                                <div>
                                  <strong className="text-red-700">Missing Requirements:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestion.missing_requirements.map((req, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs border-red-300 text-red-700">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {req}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 space-y-2">
                          {selectedTrip && !selectedTrip.sensei_id && (
                            <Button 
                              onClick={() => assignSenseiToTrip(selectedTrip.id, suggestion.sensei_id, suggestion.sensei_name, false)}
                              className="w-full"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Assign as Primary
                            </Button>
                          )}
                          {selectedTrip && !selectedTrip.backup_sensei_id && (
                            <Button 
                              variant="outline"
                              onClick={() => assignSenseiToTrip(selectedTrip.id, suggestion.sensei_id, suggestion.sensei_name, true)}
                              className="w-full"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign as Backup
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
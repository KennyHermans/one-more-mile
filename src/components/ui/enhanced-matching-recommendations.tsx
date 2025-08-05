import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Brain, MapPin, Languages, Globe, TrendingUp, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DestinationMapping {
  destination: string;
  country: string;
  primary_languages: string[];
  cultural_contexts: string[];
  activity_types: string[];
  skill_weights: any; // Using any for JSONB compatibility
}

interface EnhancedRecommendation {
  type: 'language' | 'cultural' | 'activity' | 'certification';
  skill_name: string;
  destination: string;
  impact_score: number;
  trip_count: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface EnhancedMatchingRecommendationsProps {
  senseiId: string;
}

export function EnhancedMatchingRecommendations({ senseiId }: EnhancedMatchingRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<EnhancedRecommendation[]>([]);
  const [destinationMappings, setDestinationMappings] = useState<DestinationMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEnhancedRecommendations();
  }, [senseiId]);

  const fetchEnhancedRecommendations = async () => {
    try {
      setLoading(true);

      // Fetch destination mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('destination_skill_mappings')
        .select('*');

      if (mappingsError) throw mappingsError;
      
      // Transform data to match interface
      const transformedMappings: DestinationMapping[] = (mappings || []).map(mapping => ({
        destination: mapping.destination,
        country: mapping.country,
        primary_languages: mapping.primary_languages,
        cultural_contexts: mapping.cultural_contexts,
        activity_types: mapping.activity_types,
        skill_weights: mapping.skill_weights
      }));
      
      setDestinationMappings(transformedMappings);

      // Fetch sensei's current skills
      const { data: currentSkills, error: skillsError } = await supabase
        .from('sensei_skills')
        .select('skill_name, skill_category')
        .eq('sensei_id', senseiId)
        .eq('is_active', true);

      if (skillsError) throw skillsError;

      // Fetch active trips for analysis
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('destination, theme')
        .eq('is_active', true)
        .eq('trip_status', 'approved');

      if (tripsError) throw tripsError;

      // Generate intelligent recommendations
      const enhancedRecs = generateIntelligentRecommendations(
        transformedMappings,
        currentSkills || [],
        trips || []
      );

      setRecommendations(enhancedRecs);
    } catch (error) {
      console.error('Error fetching enhanced recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load enhanced recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateIntelligentRecommendations = (
    mappings: DestinationMapping[],
    currentSkills: any[],
    trips: any[]
  ): EnhancedRecommendation[] => {
    const recommendations: EnhancedRecommendation[] = [];
    const skillNames = currentSkills.map(s => s.skill_name.toLowerCase());

    // Group trips by destination
    const tripsByDestination = trips.reduce((acc, trip) => {
      const dest = trip.destination;
      if (!acc[dest]) acc[dest] = [];
      acc[dest].push(trip);
      return acc;
    }, {} as Record<string, any[]>);

    mappings.forEach(mapping => {
      const relevantTrips = tripsByDestination[mapping.destination] || [];
      const tripCount = relevantTrips.length;

      if (tripCount === 0) return;

      // Language recommendations
      mapping.primary_languages.forEach(language => {
        const hasLanguageSkill = skillNames.some(skill => 
          skill.includes(language.toLowerCase())
        );

        if (!hasLanguageSkill) {
          recommendations.push({
            type: 'language',
            skill_name: `${language} Language`,
            destination: mapping.destination,
            impact_score: tripCount * 3,
            trip_count: tripCount,
            reasoning: `${tripCount} ${mapping.destination} trips require ${language} language skills`,
            priority: tripCount >= 3 ? 'high' : tripCount >= 2 ? 'medium' : 'low'
          });
        }
      });

      // Cultural context recommendations
      mapping.cultural_contexts.forEach(context => {
        const hasCulturalSkill = skillNames.some(skill => 
          skill.includes(context.toLowerCase()) || skill.includes('culture')
        );

        if (!hasCulturalSkill) {
          recommendations.push({
            type: 'cultural',
            skill_name: `${context} Cultural Knowledge`,
            destination: mapping.destination,
            impact_score: tripCount * 2,
            trip_count: tripCount,
            reasoning: `Understanding ${context} culture would enhance your profile for ${mapping.destination} trips`,
            priority: tripCount >= 2 ? 'high' : 'medium'
          });
        }
      });

      // Activity-specific recommendations
      mapping.activity_types.forEach(activity => {
        const hasActivitySkill = skillNames.some(skill => 
          skill.includes(activity.toLowerCase())
        );

        if (!hasActivitySkill) {
          recommendations.push({
            type: 'activity',
            skill_name: `${activity} Expertise`,
            destination: mapping.destination,
            impact_score: tripCount * 2.5,
            trip_count: tripCount,
            reasoning: `${activity} skills are valuable for ${mapping.destination} experiences`,
            priority: tripCount >= 2 ? 'high' : 'medium'
          });
        }
      });
    });

    // Sort by impact score and return top recommendations
    return recommendations
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 8);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'language': return <Languages className="h-4 w-4" />;
      case 'cultural': return <Globe className="h-4 w-4" />;
      case 'activity': return <Target className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'language': return 'default';
      case 'cultural': return 'secondary';
      case 'activity': return 'outline';
      default: return 'destructive';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Intelligent Skill Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Intelligent Skill Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered suggestions based on destination analysis and trip demand
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Great job! Your skills already cover most available trip destinations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeBadgeVariant(rec.type)} className="flex items-center gap-1">
                      {getTypeIcon(rec.type)}
                      {rec.type}
                    </Badge>
                    <Badge className={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Impact: +{rec.impact_score}
                  </div>
                </div>
                
                <h4 className="font-semibold mb-1">{rec.skill_name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{rec.reasoning}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rec.destination}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {rec.trip_count} trips
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Add Skill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={fetchEnhancedRecommendations}
        >
          <Brain className="h-4 w-4 mr-2" />
          Refresh Recommendations
        </Button>
      </CardContent>
    </Card>
  );
}
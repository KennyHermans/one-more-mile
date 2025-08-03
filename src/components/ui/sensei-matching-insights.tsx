import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Progress } from "./progress";
import { Button } from "./button";
import { TrendingUp, Target, Award, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MatchingInsights {
  id: string;
  total_trips_available: number;
  high_match_trips: number;
  medium_match_trips: number;
  low_match_trips: number;
  missing_skills: string[];
  recommended_certifications: string[];
  last_calculated: string;
}

interface SenseiMatchingInsightsProps {
  senseiId: string;
}

export function SenseiMatchingInsights({ senseiId }: SenseiMatchingInsightsProps) {
  const [insights, setInsights] = useState<MatchingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('sensei_matching_insights')
        .select('*')
        .eq('sensei_id', senseiId)
        .maybeSingle();

      if (error) throw error;
      setInsights(data);
    } catch (error) {
      console.error('Error fetching matching insights:', error);
      toast({
        title: "Error",
        description: "Failed to load matching insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.rpc('calculate_sensei_insights', {
        p_sensei_id: senseiId
      });

      if (error) throw error;
      
      await fetchInsights();
      toast({
        title: "Success",
        description: "Matching insights updated successfully",
      });
    } catch (error) {
      console.error('Error refreshing insights:', error);
      toast({
        title: "Error",
        description: "Failed to refresh matching insights",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [senseiId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trip Matching Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trip Matching Insights
          </CardTitle>
          <CardDescription>
            No insights available yet. Click refresh to generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshInsights} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalTrips = insights.total_trips_available;
  const matchedTrips = insights.high_match_trips + insights.medium_match_trips;
  const matchPercentage = totalTrips > 0 ? (matchedTrips / totalTrips) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trip Matching Overview
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(insights.last_calculated).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshInsights}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Rate Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Match Rate</span>
              <span className="font-medium">{matchPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={matchPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {matchedTrips} of {totalTrips} available trips match your profile
            </p>
          </div>

          {/* Match Distribution */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-emerald-600">
                {insights.high_match_trips}
              </div>
              <div className="text-xs text-muted-foreground">High Match</div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                Excellent Fit
              </Badge>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-amber-600">
                {insights.medium_match_trips}
              </div>
              <div className="text-xs text-muted-foreground">Medium Match</div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                Good Fit
              </Badge>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-gray-600">
                {insights.low_match_trips}
              </div>
              <div className="text-xs text-muted-foreground">Low Match</div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                Needs Work
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Opportunities */}
      {(insights.missing_skills.length > 0 || insights.recommended_certifications.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Improvement Opportunities
            </CardTitle>
            <CardDescription>
              Add these skills and certifications to improve your trip matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.missing_skills.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Skills in High Demand
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insights.missing_skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="border-amber-200 text-amber-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {insights.recommended_certifications.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  Recommended Certifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insights.recommended_certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="border-blue-200 text-blue-700">
                      {cert} Certification
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, MapPin, Calendar, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileManagement } from '@/hooks/use-profile-management';

interface SmartRecommendation {
  id: string;
  type: 'trending' | 'personalized' | 'seasonal' | 'nearby';
  title: string;
  description: string;
  confidence: number;
  destination: string;
  estimatedPrice: number;
  popularityScore: number;
  reasoning: string[];
}

export const SmartTripRecommendations = () => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useProfileManagement();

  useEffect(() => {
    generateSmartRecommendations();
  }, [user]);

  const generateSmartRecommendations = async () => {
    setIsLoading(true);
    try {
      // Generate AI-powered recommendations with mock data
      const mockRecommendations: SmartRecommendation[] = [
        {
          id: '1',
          type: 'trending',
          title: 'Cherry Blossom Photography Tour',
          description: 'Capture the perfect sakura moments with expert guidance',
          confidence: 92,
          destination: 'Kyoto, Japan',
          estimatedPrice: 1200,
          popularityScore: 89,
          reasoning: ['Similar users loved this', 'Peak season approaching', 'Your photography interest']
        },
        {
          id: '2',
          type: 'personalized',
          title: 'Alpine Hiking Adventure',
          description: 'Mountain trails tailored to your fitness level',
          confidence: 87,
          destination: 'Swiss Alps',
          estimatedPrice: 950,
          popularityScore: 76,
          reasoning: ['Matches your hiking history', 'Weather optimal', 'Sensei availability high']
        },
        {
          id: '3',
          type: 'seasonal',
          title: 'Northern Lights Experience',
          description: 'Best viewing season with aurora photography',
          confidence: 94,
          destination: 'Iceland',
          estimatedPrice: 1450,
          popularityScore: 92,
          reasoning: ['Prime viewing season', 'Clear weather forecast', 'High success rate']
        },
        {
          id: '4',
          type: 'nearby',
          title: 'Urban Street Art Discovery',
          description: 'Hidden gems in your local area',
          confidence: 78,
          destination: 'Local Metro Area',
          estimatedPrice: 200,
          popularityScore: 65,
          reasoning: ['Close to home', 'Weekend availability', 'Budget-friendly']
        }
      ];

      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trending': return <TrendingUp className="h-4 w-4" />;
      case 'personalized': return <Brain className="h-4 w-4" />;
      case 'seasonal': return <Calendar className="h-4 w-4" />;
      case 'nearby': return <MapPin className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'trending': return 'default';
      case 'personalized': return 'secondary';
      case 'seasonal': return 'outline';
      case 'nearby': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Recommendations
          </CardTitle>
          <CardDescription>AI-powered trip suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
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
          Smart Recommendations
        </CardTitle>
        <CardDescription>AI-powered trip suggestions based on your preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getTypeBadgeVariant(rec.type)} className="flex items-center gap-1">
                    {getTypeIcon(rec.type)}
                    {rec.type}
                  </Badge>
                  <Badge variant="outline">{rec.confidence}% match</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  ${rec.estimatedPrice}
                </div>
              </div>
              
              <h4 className="font-semibold mb-1">{rec.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {rec.destination}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {rec.popularityScore}% popularity
                </div>
              </div>
              
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Why this recommendation:</div>
                <div className="flex flex-wrap gap-1">
                  {rec.reasoning.map((reason, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={generateSmartRecommendations}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh Recommendations
        </Button>
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  MapPin, 
  Calendar,
  Users,
  Target,
  DollarSign,
  Lightbulb,
  RefreshCw,
  Download,
  Copy,
  Wand2,
  TrendingUp,
  Clock,
  Star,
  Brain,
  Zap
} from 'lucide-react';

interface AITripBuilderProps {
  onTripGenerated?: (tripData: any) => void;
  className?: string;
}

interface TripParams {
  destination: string;
  theme: string;
  duration: number;
  maxParticipants: number;
  difficulty: 'easy' | 'moderate' | 'challenging' | 'extreme';
  season: string;
  budget: string;
}

interface GeneratedContent {
  type: 'itinerary' | 'activities' | 'description' | 'pricing' | 'optimization';
  data: any;
  timestamp: string;
}

export function AITripBuilder({ onTripGenerated, className }: AITripBuilderProps) {
  const [tripParams, setTripParams] = useState<TripParams>({
    destination: '',
    theme: '',
    duration: 7,
    maxParticipants: 12,
    difficulty: 'moderate',
    season: '',
    budget: ''
  });

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const { toast } = useToast();

  const generateContent = async (action: string) => {
    if (!tripParams.destination || !tripParams.theme || !tripParams.season) {
      toast({
        title: "Missing Information",
        description: "Please fill in destination, theme, and season before generating content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setCurrentAction(action);

    try {
      const response = await supabase.functions.invoke('ai-trip-builder', {
        body: {
          action,
          ...tripParams,
          existingItinerary: action === 'optimize_schedule' ? getExistingItinerary() : undefined
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const newContent: GeneratedContent = {
        type: action as any,
        data: response.data,
        timestamp: new Date().toISOString()
      };

      setGeneratedContent(prev => [newContent, ...prev]);
      
      toast({
        title: "Content Generated!",
        description: `AI-powered ${action.replace('_', ' ')} has been created successfully.`,
      });

      // If generating complete itinerary, auto-convert to trip format
      if (action === 'generate_itinerary' && onTripGenerated) {
        const tripData = convertToTripFormat(response.data, tripParams);
        onTripGenerated(tripData);
      }

    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCurrentAction('');
    }
  };

  const getExistingItinerary = () => {
    const itineraryContent = generatedContent.find(c => c.type === 'itinerary');
    return itineraryContent?.data?.itinerary || [];
  };

  const convertToTripFormat = (aiData: any, params: TripParams) => {
    return {
      title: aiData.title || `${params.theme} Adventure in ${params.destination}`,
      destination: params.destination,
      description: aiData.description || `Explore ${params.destination} with this ${params.theme} journey`,
      duration_days: params.duration,
      max_participants: params.maxParticipants,
      difficulty_level: params.difficulty,
      theme: params.theme,
      season: params.season,
      price_range: aiData.pricing || { min: 1000, max: 3000, currency: 'EUR' },
      itinerary: aiData.itinerary || [],
      included_amenities: aiData.included || [],
      requirements: aiData.requirements || [],
      status: 'draft',
      created_by_sensei: true
    };
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard.",
    });
  };

  const renderGeneratedContent = (content: GeneratedContent) => {
    const iconMap = {
      itinerary: Calendar,
      activities: Target,
      description: Star,
      pricing: DollarSign,
      optimization: TrendingUp
    };

    const Icon = iconMap[content.type] || Lightbulb;

    return (
      <Card key={content.timestamp} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4" />
            {content.type.replace('_', ' ').toUpperCase()}
            <Badge variant="secondary" className="ml-auto">
              {new Date(content.timestamp).toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {content.type === 'itinerary' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {content.data.itinerary?.length || 0} days planned
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setSelectedContent(content)}
                  className="w-full"
                >
                  View Full Itinerary
                </Button>
              </div>
            )}
            
            {content.type === 'activities' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(content.data) ? content.data.length : 'Multiple'} activities suggested
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setSelectedContent(content)}
                  className="w-full"
                >
                  View Activities
                </Button>
              </div>
            )}
            
            {content.type === 'description' && (
              <div className="space-y-2">
                <p className="text-sm line-clamp-3">
                  {content.data.summary || content.data.description || 'Trip description generated'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(content.data, null, 2))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedContent(content)}
                  >
                    View Full
                  </Button>
                </div>
              </div>
            )}
            
            {content.type === 'pricing' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Pricing analysis and recommendations
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setSelectedContent(content)}
                  className="w-full"
                >
                  View Pricing Strategy
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Trip Builder
            <Badge variant="outline" className="ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by AI
            </Badge>
          </CardTitle>
          <CardDescription>
            Let AI help you create amazing trip itineraries with smart suggestions and optimizations
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Trip Setup</TabsTrigger>
              <TabsTrigger value="generate">AI Generation</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ai-destination">Destination</Label>
                    <Input
                      id="ai-destination"
                      value={tripParams.destination}
                      onChange={(e) => setTripParams(prev => ({ ...prev, destination: e.target.value }))}
                      placeholder="e.g., Patagonia, Japan, Iceland"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ai-theme">Trip Theme</Label>
                    <Select 
                      value={tripParams.theme} 
                      onValueChange={(value) => setTripParams(prev => ({ ...prev, theme: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adventure">Adventure</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="nature">Nature & Wildlife</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="wellness">Wellness & Retreat</SelectItem>
                        <SelectItem value="culinary">Culinary</SelectItem>
                        <SelectItem value="extreme">Extreme Sports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="ai-season">Best Season</Label>
                    <Select 
                      value={tripParams.season} 
                      onValueChange={(value) => setTripParams(prev => ({ ...prev, season: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="autumn">Autumn</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                        <SelectItem value="year-round">Year Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ai-duration">Duration (Days)</Label>
                      <Input
                        id="ai-duration"
                        type="number"
                        min="1"
                        max="30"
                        value={tripParams.duration}
                        onChange={(e) => setTripParams(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ai-participants">Max Participants</Label>
                      <Input
                        id="ai-participants"
                        type="number"
                        min="1"
                        max="20"
                        value={tripParams.maxParticipants}
                        onChange={(e) => setTripParams(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="ai-difficulty">Difficulty Level</Label>
                    <Select 
                      value={tripParams.difficulty} 
                      onValueChange={(value: any) => setTripParams(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="challenging">Challenging</SelectItem>
                        <SelectItem value="extreme">Extreme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="ai-budget">Budget Range</Label>
                    <Select 
                      value={tripParams.budget} 
                      onValueChange={(value) => setTripParams(prev => ({ ...prev, budget: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget (€500-1500)</SelectItem>
                        <SelectItem value="mid-range">Mid-range (€1500-3000)</SelectItem>
                        <SelectItem value="premium">Premium (€3000-5000)</SelectItem>
                        <SelectItem value="luxury">Luxury (€5000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => generateContent('generate_itinerary')}
                  disabled={isGenerating}
                  className="h-20 flex flex-col gap-1"
                >
                  <Wand2 className="h-5 w-5" />
                  <span className="font-medium">Complete Itinerary</span>
                  <span className="text-xs opacity-80">Full trip plan with daily activities</span>
                </Button>
                
                <Button
                  onClick={() => generateContent('suggest_activities')}
                  disabled={isGenerating}
                  variant="outline"
                  className="h-20 flex flex-col gap-1"
                >
                  <Target className="h-5 w-5" />
                  <span className="font-medium">Activity Suggestions</span>
                  <span className="text-xs opacity-80">Curated activities for your theme</span>
                </Button>
                
                <Button
                  onClick={() => generateContent('generate_description')}
                  disabled={isGenerating}
                  variant="outline"
                  className="h-20 flex flex-col gap-1"
                >
                  <Star className="h-5 w-5" />
                  <span className="font-medium">Marketing Copy</span>
                  <span className="text-xs opacity-80">Compelling trip descriptions</span>
                </Button>
                
                <Button
                  onClick={() => generateContent('suggest_pricing')}
                  disabled={isGenerating}
                  variant="outline"
                  className="h-20 flex flex-col gap-1"
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="font-medium">Pricing Strategy</span>
                  <span className="text-xs opacity-80">Market-based pricing recommendations</span>
                </Button>
              </div>
              
              {getExistingItinerary().length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => generateContent('optimize_schedule')}
                    disabled={isGenerating}
                    variant="secondary"
                    className="w-full h-16 flex flex-col gap-1"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">Optimize Existing Itinerary</span>
                    <span className="text-xs opacity-80">Improve timing and efficiency</span>
                  </Button>
                </div>
              )}
              
              {isGenerating && (
                <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border">
                  <Zap className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">
                    AI is generating {currentAction.replace('_', ' ')}...
                  </span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {generatedContent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No AI-generated content yet.</p>
                  <p className="text-sm">Use the AI Generation tab to create content.</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  {generatedContent.map(renderGeneratedContent)}
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content Detail Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedContent?.type.replace('_', ' ').toUpperCase()} Details
            </DialogTitle>
            <DialogDescription>
              Generated on {selectedContent && new Date(selectedContent.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {selectedContent && (
              <div className="space-y-4">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(selectedContent.data, null, 2)}
                </pre>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(JSON.stringify(selectedContent.data, null, 2))}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                  
                  {selectedContent.type === 'itinerary' && onTripGenerated && (
                    <Button
                      onClick={() => {
                        const tripData = convertToTripFormat(selectedContent.data, tripParams);
                        onTripGenerated(tripData);
                        setSelectedContent(null);
                        toast({
                          title: "Itinerary Applied!",
                          description: "AI-generated itinerary has been loaded into the trip planner.",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Use This Itinerary
                    </Button>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
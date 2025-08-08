import { useState, useEffect, createElement } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PermissionAwareAiTripBuilder } from '@/components/ui/permission-aware-ai-trip-builder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Calendar,
  CalendarIcon,
  Users,
  DollarSign,
  Camera,
  Mountain,
  Utensils,
  Bed,
  Car,
  Plane,
  Edit2,
  Trash2,
  Save,
  Eye,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  Heart,
  Share2,
  Download,
  Upload
} from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItineraryDay {
  id: string;
  day_number: number;
  title: string;
  description: string;
  activities: Activity[];
  accommodation?: string;
  meals_included: string[];
  transportation?: string;
  estimated_cost?: number;
  notes?: string;
}

interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  duration: number;
  difficulty_level: 'easy' | 'moderate' | 'challenging' | 'extreme';
  activity_type: 'hiking' | 'cultural' | 'adventure' | 'relaxation' | 'photography' | 'wildlife' | 'educational';
  equipment_needed: string[];
  cost?: number;
  is_optional: boolean;
  weather_dependent: boolean;
}

interface TripPlan {
  id?: string;
  title: string;
  destination: string;
  description: string;
  start_date: Date | null;
  end_date: Date | null;
  duration_days: number; // calculated from dates
  max_participants: number;
  difficulty_level: 'easy' | 'moderate' | 'challenging' | 'extreme';
  theme: string;
  season: string;
  price_range: {
    min: number;
    max: number;
    currency: string;
  };
  included_amenities: string[];
  excluded_items: string[];
  requirements: string[];
  itinerary: ItineraryDay[];
  created_by_sensei: boolean;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  tags: string[];
  images: string[];
}

interface AdvancedTripPlannerProps {
  senseiId?: string;
  existingPlan?: TripPlan;
  onSave?: (plan: TripPlan) => void;
  onPublish?: (plan: TripPlan) => void;
  className?: string;
}

export function AdvancedTripPlanner({ 
  senseiId, 
  existingPlan, 
  onSave, 
  onPublish, 
  className 
}: AdvancedTripPlannerProps) {
  const [tripPlan, setTripPlan] = useState<TripPlan>(existingPlan || {
    title: '',
    destination: '',
    description: '',
    start_date: null,
    end_date: null,
    duration_days: 7,
    max_participants: 12,
    difficulty_level: 'moderate',
    theme: '',
    season: '',
    price_range: { min: 1000, max: 3000, currency: 'EUR' },
    included_amenities: [],
    excluded_items: [],
    requirements: [],
    itinerary: [],
    created_by_sensei: true,
    status: 'draft',
    tags: [],
    images: []
  });

  const [currentDay, setCurrentDay] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [completionProgress, setCompletionProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    calculateCompletionProgress();
  }, [tripPlan]);

  useEffect(() => {
    // Generate initial itinerary structure when duration changes
    if (tripPlan.duration_days > 0 && tripPlan.itinerary.length !== tripPlan.duration_days) {
      generateItineraryStructure();
    }
  }, [tripPlan.duration_days]);

  const generateItineraryStructure = () => {
    const newItinerary: ItineraryDay[] = [];
    for (let i = 1; i <= tripPlan.duration_days; i++) {
      newItinerary.push({
        id: `day-${i}`,
        day_number: i,
        title: `Day ${i}`,
        description: '',
        activities: [],
        meals_included: [],
        notes: ''
      });
    }
    setTripPlan(prev => ({ ...prev, itinerary: newItinerary }));
  };

  const calculateCompletionProgress = () => {
    const fields = [
      tripPlan.title,
      tripPlan.destination,
      tripPlan.description,
      tripPlan.theme,
      tripPlan.season
    ];
    
    const filledFields = fields.filter(field => field && field.trim().length > 0).length;
    const itineraryProgress = tripPlan.itinerary.filter(day => 
      day.title && day.description && day.activities.length > 0
    ).length / Math.max(tripPlan.duration_days, 1);
    
    const totalProgress = (filledFields / fields.length) * 50 + itineraryProgress * 50;
    setCompletionProgress(Math.round(totalProgress));
  };

  const validateTripPlan = (): string[] => {
    const errors: string[] = [];
    
    if (!tripPlan.title.trim()) errors.push('Trip title is required');
    if (!tripPlan.destination.trim()) errors.push('Destination is required');
    if (!tripPlan.description.trim()) errors.push('Trip description is required');
    if (!tripPlan.theme.trim()) errors.push('Trip theme is required');
    if (tripPlan.duration_days < 1) errors.push('Duration must be at least 1 day');
    if (tripPlan.max_participants < 1) errors.push('Maximum participants must be at least 1');
    
    const emptyDays = tripPlan.itinerary.filter(day => 
      !day.title || !day.description || day.activities.length === 0
    );
    if (emptyDays.length > 0) {
      errors.push(`${emptyDays.length} day(s) need more details`);
    }
    
    return errors;
  };

  const addActivity = (dayId: string) => {
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      time: '09:00',
      title: '',
      description: '',
      location: '',
      duration: 120,
      difficulty_level: 'moderate',
      activity_type: 'adventure',
      equipment_needed: [],
      is_optional: false,
      weather_dependent: false
    };

    setTripPlan(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.id === dayId
          ? { ...day, activities: [...day.activities, newActivity] }
          : day
      )
    }));
  };

  const updateActivity = (dayId: string, activityId: string, updates: Partial<Activity>) => {
    setTripPlan(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.id === dayId
          ? {
              ...day,
              activities: day.activities.map(activity =>
                activity.id === activityId ? { ...activity, ...updates } : activity
              )
            }
          : day
      )
    }));
  };

  const removeActivity = (dayId: string, activityId: string) => {
    setTripPlan(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.id === dayId
          ? { ...day, activities: day.activities.filter(activity => activity.id !== activityId) }
          : day
      )
    }));
  };

  const updateDay = (dayId: string, updates: Partial<ItineraryDay>) => {
    setTripPlan(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.id === dayId ? { ...day, ...updates } : day
      )
    }));
  };

  const saveTripPlan = async () => {
    const errors = validateTripPlan();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fix ${errors.length} issue(s) before saving`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (onSave) {
        onSave(tripPlan);
      }
      
      toast({
        title: "Success",
        description: "Trip plan saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save trip plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const publishTripPlan = async () => {
    const errors = validateTripPlan();
    if (errors.length > 0) {
      toast({
        title: "Cannot Publish",
        description: "Please complete all required fields before publishing",
        variant: "destructive",
      });
      return;
    }

    if (onPublish) {
      onPublish({ ...tripPlan, status: 'review' });
    }
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    challenging: 'bg-orange-100 text-orange-800',
    extreme: 'bg-red-100 text-red-800'
  };

  const activityIcons = {
    hiking: Mountain,
    cultural: Star,
    adventure: Mountain,
    relaxation: Heart,
    photography: Camera,
    wildlife: Eye,
    educational: Info
  };

  const handleAITripGenerated = (aiTripData: any) => {
    setTripPlan(prev => ({
      ...prev,
      ...aiTripData,
      // Preserve existing ID and status if updating
      id: prev.id,
      status: prev.status || 'draft'
    }));
    
    toast({
      title: "AI Trip Loaded!",
      description: "The AI-generated trip has been applied to your planner.",
    });
  };

  return (
    <div className={className}>
      {/* AI Trip Builder */}
      <div className="mb-6">
        <PermissionAwareAiTripBuilder senseiId={senseiId || ''} onSuccess={() => handleAITripGenerated} />
      </div>

      {/* Main Trip Planner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Trip Planner
              </CardTitle>
              <CardDescription>
                Create and manage comprehensive trip itineraries
               </CardDescription>
             </div>
             <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {completionProgress}% Complete
            </div>
            <Progress value={completionProgress} className="w-20" />
          </div>
        </div>
        
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Issues to resolve:
            </div>
            <ul className="text-red-600 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Trip Title</Label>
                  <Input
                    id="title"
                    value={tripPlan.title}
                    onChange={(e) => setTripPlan(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter trip title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={tripPlan.destination}
                    onChange={(e) => setTripPlan(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Enter destination"
                  />
                </div>

                <div>
                  <Label htmlFor="theme">Trip Theme</Label>
                  <Select value={tripPlan.theme} onValueChange={(value) => setTripPlan(prev => ({ ...prev, theme: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="wellness">Wellness</SelectItem>
                      <SelectItem value="culinary">Culinary</SelectItem>
                      <SelectItem value="wildlife">Wildlife</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="season">Best Season</Label>
                  <Select value={tripPlan.season} onValueChange={(value) => setTripPlan(prev => ({ ...prev, season: value }))}>
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
                <div>
                  <Label>Trip Dates</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !tripPlan.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tripPlan.start_date ? format(tripPlan.start_date, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={tripPlan.start_date || undefined}
                          onSelect={(date) => {
                            setTripPlan(prev => {
                              const newPlan = { ...prev, start_date: date || null };
                              if (date && prev.end_date) {
                                newPlan.duration_days = Math.max(1, differenceInDays(prev.end_date, date) + 1);
                              }
                              return newPlan;
                            });
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !tripPlan.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tripPlan.end_date ? format(tripPlan.end_date, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={tripPlan.end_date || undefined}
                          onSelect={(date) => {
                            setTripPlan(prev => {
                              const newPlan = { ...prev, end_date: date || null };
                              if (date && prev.start_date) {
                                newPlan.duration_days = Math.max(1, differenceInDays(date, prev.start_date) + 1);
                              }
                              return newPlan;
                            });
                          }}
                          disabled={(date) => date < new Date() || (tripPlan.start_date && date <= tripPlan.start_date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {tripPlan.start_date && tripPlan.end_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Duration: {tripPlan.duration_days} days
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="participants">Max Participants</Label>
                  <Input
                    id="participants"
                    type="number"
                    min="1"
                    max="20"
                    value={tripPlan.max_participants}
                    onChange={(e) => setTripPlan(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select 
                    value={tripPlan.difficulty_level} 
                    onValueChange={(value: any) => setTripPlan(prev => ({ ...prev, difficulty_level: value }))}
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

                <div className="space-y-2">
                  <Label>Price Range (EUR)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="min-price" className="text-xs">Minimum</Label>
                      <Input
                        id="min-price"
                        type="number"
                        value={tripPlan.price_range.min}
                        onChange={(e) => setTripPlan(prev => ({
                          ...prev,
                          price_range: { ...prev.price_range, min: parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-price" className="text-xs">Maximum</Label>
                      <Input
                        id="max-price"
                        type="number"
                        value={tripPlan.price_range.max}
                        onChange={(e) => setTripPlan(prev => ({
                          ...prev,
                          price_range: { ...prev.price_range, max: parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Trip Description</Label>
              <Textarea
                id="description"
                value={tripPlan.description}
                onChange={(e) => setTripPlan(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the trip experience, highlights, and what makes it special..."
                className="min-h-[120px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="itinerary" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Daily Itinerary</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Day {currentDay} of {tripPlan.duration_days}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: tripPlan.duration_days }, (_, i) => i + 1).map(day => (
                    <Button
                      key={day}
                      size="sm"
                      variant={currentDay === day ? "default" : "outline"}
                      onClick={() => setCurrentDay(day)}
                      className="w-8 h-8 p-0"
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {tripPlan.itinerary.find(day => day.day_number === currentDay) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <Input
                        value={tripPlan.itinerary.find(day => day.day_number === currentDay)?.title || ''}
                        onChange={(e) => updateDay(
                          `day-${currentDay}`,
                          { title: e.target.value }
                        )}
                        placeholder="Day title"
                        className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
                      />
                    </div>
                    <Button
                      onClick={() => addActivity(`day-${currentDay}`)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                  <Textarea
                    value={tripPlan.itinerary.find(day => day.day_number === currentDay)?.description || ''}
                    onChange={(e) => updateDay(
                      `day-${currentDay}`,
                      { description: e.target.value }
                    )}
                    placeholder="Describe what participants will experience on this day..."
                    className="border-none p-0 resize-none bg-transparent"
                  />
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {tripPlan.itinerary
                    .find(day => day.day_number === currentDay)
                    ?.activities.map((activity, index) => (
                      <Card key={activity.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-muted-foreground">
                              {activity.time}
                            </div>
                            {createElement(activityIcons[activity.activity_type] || Mountain, {
                              className: "h-4 w-4 text-muted-foreground"
                            })}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeActivity(`day-${currentDay}`, activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <Input
                              value={activity.title}
                              onChange={(e) => updateActivity(
                                `day-${currentDay}`,
                                activity.id,
                                { title: e.target.value }
                              )}
                              placeholder="Activity title"
                            />
                            
                            <Textarea
                              value={activity.description}
                              onChange={(e) => updateActivity(
                                `day-${currentDay}`,
                                activity.id,
                                { description: e.target.value }
                              )}
                              placeholder="Activity description"
                              className="resize-none"
                            />
                            
                            <Input
                              value={activity.location}
                              onChange={(e) => updateActivity(
                                `day-${currentDay}`,
                                activity.id,
                                { location: e.target.value }
                              )}
                              placeholder="Location"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Duration (minutes)</Label>
                                <Input
                                  type="number"
                                  value={activity.duration}
                                  onChange={(e) => updateActivity(
                                    `day-${currentDay}`,
                                    activity.id,
                                    { duration: parseInt(e.target.value) || 0 }
                                  )}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Time</Label>
                                <Input
                                  type="time"
                                  value={activity.time}
                                  onChange={(e) => updateActivity(
                                    `day-${currentDay}`,
                                    activity.id,
                                    { time: e.target.value }
                                  )}
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={activity.difficulty_level}
                                onValueChange={(value: any) => updateActivity(
                                  `day-${currentDay}`,
                                  activity.id,
                                  { difficulty_level: value }
                                )}
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
                              
                              <Select
                                value={activity.activity_type}
                                onValueChange={(value: any) => updateActivity(
                                  `day-${currentDay}`,
                                  activity.id,
                                  { activity_type: value }
                                )}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hiking">Hiking</SelectItem>
                                  <SelectItem value="cultural">Cultural</SelectItem>
                                  <SelectItem value="adventure">Adventure</SelectItem>
                                  <SelectItem value="relaxation">Relaxation</SelectItem>
                                  <SelectItem value="photography">Photography</SelectItem>
                                  <SelectItem value="wildlife">Wildlife</SelectItem>
                                  <SelectItem value="educational">Educational</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`optional-${activity.id}`}
                                  checked={activity.is_optional}
                                  onCheckedChange={(checked) => updateActivity(
                                    `day-${currentDay}`,
                                    activity.id,
                                    { is_optional: checked as boolean }
                                  )}
                                />
                                <Label htmlFor={`optional-${activity.id}`} className="text-xs">
                                  Optional
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`weather-${activity.id}`}
                                  checked={activity.weather_dependent}
                                  onCheckedChange={(checked) => updateActivity(
                                    `day-${currentDay}`,
                                    activity.id,
                                    { weather_dependent: checked as boolean }
                                  )}
                                />
                                <Label htmlFor={`weather-${activity.id}`} className="text-xs">
                                  Weather dependent
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Badge className={difficultyColors[activity.difficulty_level]}>
                            {activity.difficulty_level}
                          </Badge>
                          <Badge variant="outline">
                            {activity.activity_type}
                          </Badge>
                          {activity.is_optional && (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                          {activity.weather_dependent && (
                            <Badge variant="outline">Weather Dependent</Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logistics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Included Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Accommodation', 'Meals', 'Transportation', 'Guide Services', 'Equipment', 'Insurance'].map(amenity => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity}`}
                          checked={tripPlan.included_amenities.includes(amenity)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTripPlan(prev => ({
                                ...prev,
                                included_amenities: [...prev.included_amenities, amenity]
                              }));
                            } else {
                              setTripPlan(prev => ({
                                ...prev,
                                included_amenities: prev.included_amenities.filter(a => a !== amenity)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`amenity-${amenity}`}>{amenity}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Valid Passport', 'Travel Insurance', 'Vaccinations', 'Fitness Level', 'Experience'].map(requirement => (
                      <div key={requirement} className="flex items-center space-x-2">
                        <Checkbox
                          id={`req-${requirement}`}
                          checked={tripPlan.requirements.includes(requirement)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTripPlan(prev => ({
                                ...prev,
                                requirements: [...prev.requirements, requirement]
                              }));
                            } else {
                              setTripPlan(prev => ({
                                ...prev,
                                requirements: prev.requirements.filter(r => r !== requirement)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`req-${requirement}`}>{requirement}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tripPlan.title || 'Untitled Trip'}</CardTitle>
                <CardDescription>
                  {tripPlan.destination} • {tripPlan.duration_days} days • {tripPlan.theme}
                </CardDescription>
                <div className="flex gap-2">
                  <Badge className={difficultyColors[tripPlan.difficulty_level]}>
                    {tripPlan.difficulty_level}
                  </Badge>
                  <Badge variant="outline">{tripPlan.season}</Badge>
                  <Badge variant="secondary">
                    ${tripPlan.price_range.min} - ${tripPlan.price_range.max}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{tripPlan.description}</p>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Itinerary Overview</h4>
                  {tripPlan.itinerary.map(day => (
                    <div key={day.id} className="border-l-2 border-primary/20 pl-4">
                      <h5 className="font-medium">{day.title}</h5>
                      <p className="text-sm text-muted-foreground">{day.description}</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {day.activities.length} activities planned
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Auto-saved • Last update: {new Date().toLocaleTimeString()}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={saveTripPlan}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            <Button
              onClick={publishTripPlan}
              disabled={saving || completionProgress < 80}
            >
              <Upload className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
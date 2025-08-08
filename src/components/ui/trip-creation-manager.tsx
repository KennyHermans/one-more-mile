import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Plus, Wand2 } from 'lucide-react';
import { useSenseiPermissions } from '@/hooks/use-sensei-permissions';
import { SharedTripEditor } from './shared-trip-editor';
import { PermissionAwareAiTripBuilder } from './permission-aware-ai-trip-builder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
interface TripCreationManagerProps {
  senseiId: string;
  mode: 'create-trip' | 'ai-builder';
  onSuccess?: () => void;
}

export function TripCreationManager({ senseiId, mode, onSuccess }: TripCreationManagerProps) {
  const { permissions, isLoading } = useSenseiPermissions(senseiId);
  const { toast } = useToast();
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Loading permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'ai-builder' && !permissions?.can_use_ai_builder) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Wand2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Builder - Master Sensei Feature</h3>
              <p className="text-muted-foreground mb-4">
                The AI Trip Builder is exclusive to Master Sensei level. 
                Continue building your expertise and ratings to unlock this powerful feature.
              </p>
              <Badge variant="outline" className="px-4 py-2">
                Master Sensei Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'create-trip' && !permissions?.can_create_trips) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Trip Creation - Journey Guide Feature</h3>
              <p className="text-muted-foreground mb-4">
                Trip creation is available starting at Journey Guide level. 
                Lead more trips and improve your ratings to unlock this feature.
              </p>
              <Badge variant="outline" className="px-4 py-2">
                Journey Guide Required
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAiTripGenerated = async (aiTripData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save AI-generated trip.",
          variant: "destructive",
        });
        return;
      }

      const dates = aiTripData?.start_date && aiTripData?.end_date
        ? `${format(new Date(aiTripData.start_date), 'MMM d, yyyy')} - ${format(new Date(aiTripData.end_date), 'MMM d, yyyy')}`
        : '';

      const rawDifficulty = aiTripData?.difficulty_level || aiTripData?.difficulty || 'Moderate';
      const difficulty_level = typeof rawDifficulty === 'string' 
        ? rawDifficulty.charAt(0).toUpperCase() + rawDifficulty.slice(1)
        : 'Moderate';

      const program = Array.isArray(aiTripData?.itinerary)
        ? aiTripData.itinerary.map((day: any, idx: number) => ({
            day: day?.day || idx + 1,
            title: day?.title || day?.name || `Day ${idx + 1}`,
            description: day?.description || day?.summary || '',
            activities: Array.isArray(day?.activities)
              ? day.activities.map((a: any) => (typeof a === 'string' ? a : (a?.name || a?.title || 'Activity')))
              : []
          }))
        : [];

      const price = aiTripData?.price_range
        ? `${aiTripData.price_range.currency || 'EUR'} ${aiTripData.price_range.min || ''}${aiTripData.price_range.max ? ' - ' + aiTripData.price_range.max : ''}`
        : '';

      const tripData = {
        title: aiTripData?.title || `${aiTripData?.theme || 'Adventure'} in ${aiTripData?.destination || ''}`.trim(),
        destination: aiTripData?.destination || '',
        description: aiTripData?.description || `AI-generated ${aiTripData?.theme || 'adventure'} trip`,
        price,
        dates,
        duration_days: aiTripData?.duration_days || aiTripData?.duration || program.length || 7,
        group_size: aiTripData?.max_participants ? `${aiTripData.max_participants}` : '',
        theme: aiTripData?.theme || '',
        difficulty_level,
        max_participants: aiTripData?.max_participants || 12,
        image_url: aiTripData?.image_url || '',
        requirements: Array.isArray(aiTripData?.requirements) ? aiTripData.requirements : [],
        included_amenities: Array.isArray(aiTripData?.included_amenities) ? aiTripData.included_amenities : (Array.isArray(aiTripData?.included) ? aiTripData.included : []),
        excluded_items: Array.isArray(aiTripData?.excluded_items) ? aiTripData.excluded_items : [],
        program: JSON.stringify(program),
        sensei_id: senseiId,
        sensei_name: user.user_metadata?.full_name || user.email,
        trip_status: 'draft',
        created_by_sensei: true,
        created_by_user_id: user.id,
        current_participants: 0,
        is_active: false,
      } as any;

      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      toast({
        title: "Draft created",
        description: "AI itinerary saved as draft. Review it in Trips.",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving AI trip draft:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save AI trip",
        variant: "destructive",
      });
    }
  };

  if (mode === 'ai-builder') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="h-6 w-6" />
              AI Trip Builder
            </h2>
            <p className="text-muted-foreground">Use AI to create amazing trip proposals effortlessly</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Master Sensei Feature
          </Badge>
        </div>
        
        <PermissionAwareAiTripBuilder 
          senseiId={senseiId}
          onTripGenerated={handleAiTripGenerated}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Create Trip
          </h2>
          <p className="text-muted-foreground">Design your next adventure for travelers</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Journey Guide Feature
        </Badge>
      </div>
      
      <SharedTripEditor
        role="sensei"
        editingTrip={null}
        onClose={() => onSuccess?.()}
        onSaved={() => onSuccess?.()}
        senseiId={senseiId}
      />
    </div>
  );
}
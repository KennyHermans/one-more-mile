import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReplacementRequest {
  tripId: string;
  currentSenseiId: string;
  newSenseiId: string;
  reason?: string;
}

export const useSenseiReplacementSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSenseiReplacement = async (request: ReplacementRequest): Promise<{ success: boolean, elevated: boolean }> => {
    setIsProcessing(true);
    
    try {
      // Get trip details including permission levels
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          id, 
          title, 
          sensei_id,
          required_permission_level,
          created_by_sensei_level
        `)
        .eq('id', request.tripId)
        .single();

      if (tripError) throw tripError;

      // Get current sensei level
      const { data: currentSenseiData, error: currentSenseiError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', request.currentSenseiId)
        .single();

      if (currentSenseiError) throw currentSenseiError;

      // Get new sensei level
      const { data: newSenseiData, error: newSenseiError } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', request.newSenseiId)
        .single();

      if (newSenseiError) throw newSenseiError;

      const currentSenseiLevel = currentSenseiData.sensei_level;
      const newSenseiLevel = newSenseiData.sensei_level;
      const requiredLevel = tripData.required_permission_level || currentSenseiLevel;

      // Define level hierarchy for comparison
      const levelHierarchy = {
        'apprentice': 1,
        'journey_guide': 2,
        'master_sensei': 3
      };

      const needsElevation = levelHierarchy[newSenseiLevel as keyof typeof levelHierarchy] < 
                            levelHierarchy[requiredLevel as keyof typeof levelHierarchy];

      // Update trip assignment
      const { error: updateError } = await supabase
        .from('trips')
        .update({ 
          sensei_id: request.newSenseiId,
          backup_sensei_id: null // Clear backup since we're replacing primary
        })
        .eq('id', request.tripId);

      if (updateError) throw updateError;

      // Grant elevated permissions if needed
      if (needsElevation) {
        const { error: permissionError } = await supabase.rpc('grant_trip_specific_permission', {
          p_trip_id: request.tripId,
          p_sensei_id: request.newSenseiId,
          p_elevated_level: requiredLevel,
          p_reason: `Auto-granted for replacement. Original: ${newSenseiLevel}, Required: ${requiredLevel}. ${request.reason || ''}`
        });

        if (permissionError) {
          console.error('Error granting elevated permissions:', permissionError);
          // Don't fail the replacement if permission grant fails
        }

        toast.success(
          `Sensei replacement successful! ${newSenseiLevel} sensei elevated to ${requiredLevel} permissions for this trip.`
        );
      } else {
        toast.success('Sensei replacement completed successfully!');
      }

      // Log the replacement for audit purposes
      const { error: logError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: null, // System action
          action: 'sensei_replacement',
          table_name: 'trips',
          record_id: request.tripId,
          old_values: { 
            sensei_id: request.currentSenseiId,
            sensei_level: currentSenseiLevel
          },
          new_values: { 
            sensei_id: request.newSenseiId,
            sensei_level: newSenseiLevel,
            elevated_permissions: needsElevation ? requiredLevel : null
          }
        });

      if (logError) console.warn('Failed to log replacement action:', logError);

      return { success: true, elevated: needsElevation };

    } catch (error) {
      console.error('Error handling sensei replacement:', error);
      toast.error('Failed to process sensei replacement');
      return { success: false, elevated: false };
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPermissionCompatibility = async (tripId: string, senseiId: string) => {
    try {
      // Get trip and sensei data separately since new columns may not be in types
      const { data: tripData } = await supabase
        .from('trips')
        .select('id, sensei_id')
        .eq('id', tripId)
        .single();

      const { data: senseiData } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', senseiId)
        .single();

      const { data: currentSenseiData } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', tripData?.sensei_id)
        .single();

      if (!tripData || !senseiData || !currentSenseiData) {
        return { compatible: false, needsElevation: false };
      }

      const requiredLevel = currentSenseiData.sensei_level || 'apprentice';
      const senseiLevel = senseiData.sensei_level;

      const levelHierarchy = {
        'apprentice': 1,
        'journey_guide': 2,
        'master_sensei': 3
      };

      const compatible = levelHierarchy[senseiLevel as keyof typeof levelHierarchy] >= 
                        levelHierarchy[requiredLevel as keyof typeof levelHierarchy];

      return {
        compatible,
        needsElevation: !compatible,
        senseiLevel,
        requiredLevel
      };
    } catch (error) {
      console.error('Error checking permission compatibility:', error);
      return { compatible: false, needsElevation: false };
    }
  };

  return {
    handleSenseiReplacement,
    checkPermissionCompatibility,
    isProcessing
  };
};
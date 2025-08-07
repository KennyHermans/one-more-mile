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

  const handleSenseiReplacement = async (request: ReplacementRequest) => {
    setIsProcessing(true);
    
    try {
      // Get trip details - use basic query since new columns may not be in types yet
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('id, title, sensei_id')
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
      const requiredLevel = currentSenseiLevel; // Use current sensei's level as baseline

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

      // Grant elevated permissions if needed (simplified approach for now)
      if (needsElevation) {
        // For now, just log that elevation would be needed
        console.log(`Would grant ${requiredLevel} permissions to ${newSenseiLevel} sensei for trip ${request.tripId}`);
        
        toast.success(
          `Sensei replacement successful! Note: ${newSenseiLevel} sensei will need ${requiredLevel} permissions for this trip.`
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
          old_values: { sensei_id: request.currentSenseiId },
          new_values: { sensei_id: request.newSenseiId },
          metadata: {
            reason: request.reason,
            elevated_permissions: needsElevation,
            original_level: newSenseiLevel,
            required_level: requiredLevel
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
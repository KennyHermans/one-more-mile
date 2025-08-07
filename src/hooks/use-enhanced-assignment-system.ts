import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssignmentContext {
  tripId: string;
  primarySenseiId?: string;
  requirementType: 'primary' | 'backup';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
}

interface MatchedSensei {
  senseiId: string;
  name: string;
  matchScore: number;
  weightedScore: number;
  availability: boolean;
  specialtyMatches: string[];
  missingRequirements: string[];
  conflictRisk: 'none' | 'low' | 'medium' | 'high';
  autoAssignable: boolean;
}

interface AssignmentResult {
  success: boolean;
  assignedSenseiId?: string;
  backupOptions?: MatchedSensei[];
  conflicts?: string[];
  recommendedAction: string;
  requiresManualReview: boolean;
}

export const useEnhancedAssignmentSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentResult[]>([]);
  const { toast } = useToast();

  const findOptimalSenseiMatches = useCallback(async (
    context: AssignmentContext
  ): Promise<MatchedSensei[]> => {
    try {
      // Get trip details for enhanced matching
      const { data: tripData } = await supabase
        .from('trips')
        .select('theme, destination, dates, requirements:trip_requirements(*)')
        .eq('id', context.tripId)
        .single();

      if (!tripData) throw new Error('Trip not found');

      // Get all available senseis and calculate matches
      const { data: availableSenseis, error: senseisError } = await supabase
        .from('sensei_profiles')
        .select('id, name, specialties, rating, is_active')
        .eq('is_active', true);

      if (senseisError) throw senseisError;

      // Calculate match scores for each sensei
      const matches = await Promise.all(
        availableSenseis.map(async (sensei) => {
          const { data: matchData } = await supabase
            .rpc('calculate_sensei_match_score_enhanced', {
              p_sensei_id: sensei.id,
              p_trip_theme: tripData.theme,
              p_trip_months: [],
              p_trip_id: context.tripId
            });

          return {
            sensei_id: sensei.id,
            sensei_name: sensei.name,
            match_score: matchData?.[0]?.match_score || 0,
            weighted_score: matchData?.[0]?.weighted_score || 0,
            specialty_matches: matchData?.[0]?.specialty_matches || [],
            missing_requirements: matchData?.[0]?.missing_requirements || [],
            requirements_met_percentage: matchData?.[0]?.requirements_met_percentage || 0
          };
        })
      );

      // Process and rank matches with conflict detection
      const processedMatches = await Promise.all(
        matches.map(async (match: any) => {
          // Check for scheduling conflicts (simplified for now)
          const { data: conflicts } = await supabase
            .from('sensei_availability_calendar')
            .select('*')
            .eq('sensei_id', match.sensei_id)
            .eq('availability_type', 'unavailable');

          const conflictRisk: 'none' | 'low' | 'medium' | 'high' = 
            conflicts && conflicts.length > 0 ? 'high' : 
            match.weighted_score < 10 ? 'medium' :
            match.requirements_met_percentage < 80 ? 'low' : 'none';

          return {
            senseiId: match.sensei_id,
            name: match.sensei_name,
            matchScore: match.match_score,
            weightedScore: match.weighted_score,
            availability: conflicts?.length === 0,
            specialtyMatches: match.specialty_matches || [],
            missingRequirements: match.missing_requirements || [],
            conflictRisk,
            autoAssignable: match.weighted_score >= 15 && 
                           match.requirements_met_percentage >= 90 &&
                           conflictRisk === 'none'
          };
        })
      );

      return processedMatches
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 10); // Return top 10 matches

    } catch (error) {
      console.error('Error finding sensei matches:', error);
      throw error;
    }
  }, []);

  const executeSmartAssignment = useCallback(async (
    context: AssignmentContext
  ): Promise<AssignmentResult> => {
    setIsProcessing(true);
    
    try {
      const matches = await findOptimalSenseiMatches(context);
      
      if (matches.length === 0) {
        return {
          success: false,
          recommendedAction: 'No suitable senseis found. Consider expanding search criteria.',
          requiresManualReview: true
        };
      }

      // Find the best auto-assignable sensei
      const autoAssignable = matches.find(m => m.autoAssignable);
      
      if (autoAssignable && context.urgencyLevel !== 'critical') {
        // Auto-assign the best match
        const { error: assignError } = await supabase
          .from('trips')
          .update({ 
            [context.requirementType === 'primary' ? 'sensei_id' : 'backup_sensei_id']: autoAssignable.senseiId,
            updated_at: new Date().toISOString()
          })
          .eq('id', context.tripId);

        if (assignError) throw assignError;

        // Record assignment history
        const result: AssignmentResult = {
          success: true,
          assignedSenseiId: autoAssignable.senseiId,
          backupOptions: matches.slice(1, 4),
          conflicts: [],
          recommendedAction: `Automatically assigned ${autoAssignable.name} (${autoAssignable.weightedScore.toFixed(1)} match score)`,
          requiresManualReview: false
        };

        setAssignmentHistory(prev => [...prev, result]);
        
        toast({
          title: "Assignment Complete",
          description: `${autoAssignable.name} has been assigned to the trip.`,
        });

        return result;
      }

      // Manual review required
      const result: AssignmentResult = {
        success: false,
        backupOptions: matches,
        conflicts: matches
          .filter(m => m.conflictRisk !== 'none')
          .map(m => `${m.name}: ${m.conflictRisk} risk`),
        recommendedAction: context.urgencyLevel === 'critical' 
          ? 'Critical assignment - immediate manual review required'
          : 'Multiple options available - manual selection recommended',
        requiresManualReview: true
      };

      return result;

    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: "Unable to process assignment. Please try manual selection.",
        variant: "destructive",
      });

      return {
        success: false,
        recommendedAction: 'System error - manual assignment required',
        requiresManualReview: true
      };
    } finally {
      setIsProcessing(false);
    }
  }, [findOptimalSenseiMatches, toast]);

  const requestBackupSenseis = useCallback(async (
    tripId: string,
    requestCount: number = 3
  ): Promise<boolean> => {
    try {
      const context: AssignmentContext = {
        tripId,
        requirementType: 'backup',
        urgencyLevel: 'medium'
      };

      const matches = await findOptimalSenseiMatches(context);
      const topMatches = matches.slice(0, requestCount);

      // Send backup requests to top matches
      const requests = topMatches.map(match => ({
        trip_id: tripId,
        sensei_id: match.senseiId,
        match_score: match.matchScore,
        response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
        request_type: 'automatic'
      }));

      const { error } = await supabase
        .from('backup_sensei_requests')
        .insert(requests);

      if (error) throw error;

      toast({
        title: "Backup Requests Sent",
        description: `Sent backup requests to ${topMatches.length} qualified senseis.`,
      });

      return true;
    } catch (error) {
      console.error('Error requesting backup senseis:', error);
      toast({
        title: "Request Failed",
        description: "Unable to send backup requests.",
        variant: "destructive",
      });
      return false;
    }
  }, [findOptimalSenseiMatches, toast]);

  const resolveAssignmentConflicts = useCallback(async (
    tripId: string
  ): Promise<string[]> => {
    try {
      // Check for various conflict types
      const conflicts: string[] = [];

      // Check for overlapping assignments
      const { data: trip } = await supabase
        .from('trips')
        .select('sensei_id, backup_sensei_id, dates')
        .eq('id', tripId)
        .single();

      if (trip?.sensei_id) {
        const { data: overlapping } = await supabase
          .from('trips')
          .select('id, title')
          .eq('sensei_id', trip.sensei_id)
          .neq('id', tripId)
          .overlaps('dates', trip.dates);

        if (overlapping?.length > 0) {
          conflicts.push(`Primary sensei has ${overlapping.length} overlapping assignments`);
        }
      }

      // Check backup conflicts
      if (trip?.backup_sensei_id) {
        const { data: backupConflicts } = await supabase
          .from('trips')
          .select('id, title')
          .eq('backup_sensei_id', trip.backup_sensei_id)
          .neq('id', tripId)
          .overlaps('dates', trip.dates);

        if (backupConflicts?.length > 0) {
          conflicts.push(`Backup sensei has ${backupConflicts.length} overlapping assignments`);
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return ['Unable to verify assignment conflicts'];
    }
  }, []);

  return {
    isProcessing,
    assignmentHistory,
    findOptimalSenseiMatches,
    executeSmartAssignment,
    requestBackupSenseis,
    resolveAssignmentConflicts
  };
};
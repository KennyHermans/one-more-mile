import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedSenseiStatus {
  sensei_id: string;
  sensei_name: string;
  level_achieved_at: string;
  trips_led: number;
  is_linked_to_trip: boolean;
  current_trip_count: number;
  is_available: boolean;
  specialties: string[];
  certifications: string[];
  location: string;
  rating: number;
  verified_skills_count: number;
  pending_certificates_count: number;
  last_activity: string;
}

export function useRealtimeSenseiOverview() {
  const [senseis, setSenseis] = useState<EnhancedSenseiStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSenseiStatus = async () => {
    try {
      // Fallback to basic sensei profile query since RPC function doesn't exist
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select(`
          id,
          user_id,
          name,
          location,
          rating,
          trips_led,
          is_active,
          specialties,
          certifications,
          created_at
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Transform data to match expected interface
      const transformedData = (data || []).map(sensei => ({
        sensei_id: sensei.id,
        sensei_name: sensei.name,
        level_achieved_at: sensei.created_at,
        trips_led: sensei.trips_led || 0,
        is_linked_to_trip: false, // Will be calculated later
        current_trip_count: 0,
        is_available: sensei.is_active,
        specialties: sensei.specialties || [],
        certifications: sensei.certifications || [],
        location: sensei.location || '',
        rating: sensei.rating || 0,
        verified_skills_count: 0,
        pending_certificates_count: 0,
        last_activity: sensei.created_at
      }));
      
      setSenseis(transformedData);
    } catch (error) {
      console.error('Error fetching sensei status:', error);
      toast.error('Failed to load sensei overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenseiStatus();

    // Set up real-time subscriptions for automatic updates
    const channel = supabase
      .channel('admin-sensei-overview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_profiles'
        },
        () => {
          console.log('Sensei profile updated, refreshing data');
          fetchSenseiStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips'
        },
        () => {
          console.log('Trip updated, refreshing sensei data');
          fetchSenseiStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_reviews'
        },
        () => {
          console.log('Review updated, refreshing sensei ratings');
          fetchSenseiStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_skills'
        },
        () => {
          console.log('Sensei skills updated, refreshing data');
          fetchSenseiStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_certificates'
        },
        () => {
          console.log('Sensei certificates updated, refreshing data');
          fetchSenseiStatus();
        }
      )
      .subscribe();

    // Also refresh data every 30 seconds as a fallback
    const interval = setInterval(fetchSenseiStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    senseis,
    loading,
    refetch: fetchSenseiStatus
  };
}
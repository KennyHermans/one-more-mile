import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileManagement } from './use-profile-management';

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useProfileManagement();

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Call the database function to check admin status
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: user.id
      });

      if (error) {
        console.error('Error checking admin status:', error);
        setError(error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (err) {
      console.error('Unexpected error checking admin status:', err);
      setError('Failed to check admin status');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  return {
    isAdmin,
    isLoading,
    error,
    refreshAdminStatus: checkAdminStatus
  };
};
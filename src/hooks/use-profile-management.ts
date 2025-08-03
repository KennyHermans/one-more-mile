import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface ProfileStatus {
  hasCustomerProfile: boolean;
  hasSenseiProfile: boolean;
  isLoading: boolean;
  customerProfile: any | null;
  senseiProfile: any | null;
}

export const useProfileManagement = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    hasCustomerProfile: false,
    hasSenseiProfile: false,
    isLoading: true,
    customerProfile: null,
    senseiProfile: null,
  });

  const checkUserProfiles = async (userId: string) => {
    try {
      setProfileStatus(prev => ({ ...prev, isLoading: true }));
      
      // Check for both profiles simultaneously
      const [senseiResult, customerResult] = await Promise.all([
        supabase
          .from('sensei_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      setProfileStatus({
        hasCustomerProfile: !!customerResult.data,
        hasSenseiProfile: !!senseiResult.data,
        isLoading: false,
        customerProfile: customerResult.data,
        senseiProfile: senseiResult.data,
      });
    } catch (error) {
      console.error('Error checking user profiles:', error);
      setProfileStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const createCustomerProfile = async (userId: string, userData?: any) => {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .insert([
          {
            user_id: userId,
            full_name: userData?.name || '',
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh profile status
      await checkUserProfiles(userId);
      return data;
    } catch (error) {
      console.error('Error creating customer profile:', error);
      throw error;
    }
  };

  const determineDefaultRole = () => {
    if (profileStatus.hasSenseiProfile && !profileStatus.hasCustomerProfile) {
      return 'sensei';
    }
    return 'customer'; // Default to customer for all other cases
  };

  const getAvailableDashboards = () => {
    const dashboards = [];
    
    if (profileStatus.hasCustomerProfile) {
      dashboards.push({ role: 'customer', path: '/customer/dashboard', label: 'Customer Dashboard' });
    }
    
    if (profileStatus.hasSenseiProfile) {
      dashboards.push({ role: 'sensei', path: '/sensei/dashboard', label: 'Sensei Dashboard' });
    }
    
    return dashboards;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile checking to avoid auth callback deadlocks
          setTimeout(() => {
            checkUserProfiles(session.user.id);
          }, 0);
        } else {
          setProfileStatus({
            hasCustomerProfile: false,
            hasSenseiProfile: false,
            isLoading: false,
            customerProfile: null,
            senseiProfile: null,
          });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserProfiles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    profileStatus,
    createCustomerProfile,
    determineDefaultRole,
    getAvailableDashboards,
    refreshProfiles: () => user ? checkUserProfiles(user.id) : null,
  };
};
import { supabase } from '@/integrations/supabase/client';

/**
 * Authentication debugging utility
 * Helps diagnose session and admin status issues
 */
export const debugAuthState = async () => {
  console.log('=== AUTH DEBUG START ===');
  
  try {
    // Check client-side session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('1. Client Session:', {
      exists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      error: sessionError
    });

    // Check if user exists
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('2. Current User:', {
      exists: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError
    });

    if (user) {
      // Test database connection with auth context
      try {
        const { data: authTestData, error: authTestError } = await supabase.rpc('is_admin', {
          user_id: user.id
        });
        console.log('3. Admin Check Result:', {
          isAdmin: authTestData,
          error: authTestError
        });
      } catch (error) {
        console.log('3. Admin Check Failed:', error);
      }

      // Check if auth.uid() works in database context
      try {
        const { data: authUidTest, error: authUidError } = await supabase
          .from('admin_roles')
          .select('user_id, role, is_active')
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('4. Direct Admin Role Query:', {
          found: !!authUidTest,
          data: authUidTest,
          error: authUidError
        });
      } catch (error) {
        console.log('4. Direct Admin Role Query Failed:', error);
      }

      // Test RLS by trying to access a protected table
      try {
        const { data: tripsTest, error: tripsError } = await supabase
          .from('trips')
          .select('id')
          .limit(1);
        
        console.log('5. RLS Test (Trips Access):', {
          canAccess: !tripsError,
          count: tripsTest?.length || 0,
          error: tripsError
        });
      } catch (error) {
        console.log('5. RLS Test Failed:', error);
      }
    }

    // Check localStorage auth tokens
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('supabase.auth.') || key.includes('sb-')
    );
    console.log('6. Auth Storage Keys:', authKeys);

  } catch (error) {
    console.error('Auth debug failed:', error);
  }
  
  console.log('=== AUTH DEBUG END ===');
};

/**
 * Force refresh authentication session
 */
export const refreshAuthSession = async () => {
  try {
    console.log('Refreshing auth session...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
    
    console.log('Session refreshed successfully:', {
      userId: data.session?.user?.id,
      hasSession: !!data.session
    });
    
    return true;
  } catch (error) {
    console.error('Session refresh error:', error);
    return false;
  }
};

/**
 * Enhanced authentication check with debugging
 */
export const validateAuthForAdmin = async () => {
  const debug = await debugAuthState();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  // Check admin status
  const { data: isAdmin, error } = await supabase.rpc('is_admin', {
    user_id: user.id
  });
  
  if (error) {
    throw new Error(`Admin check failed: ${error.message}`);
  }
  
  if (!isAdmin) {
    throw new Error('User is not an admin');
  }
  
  return { user, isAdmin: true };
};
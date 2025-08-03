import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive auth state cleanup utility
 * Prevents authentication limbo states by clearing all auth-related data
 */
export const cleanupAuthState = () => {
  try {
    // Clear standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth state cleanup completed');
  } catch (error) {
    console.warn('Error during auth state cleanup:', error);
  }
};

/**
 * Enhanced sign out with comprehensive cleanup
 */
export const secureSignOut = async (): Promise<void> => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out (fallback if it fails)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Global sign out failed, but continuing with cleanup:', error);
    }
    
    // Force page reload for a clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Error during secure sign out:', error);
    // Force reload anyway to ensure clean state
    window.location.href = '/auth';
  }
};

/**
 * Enhanced sign in with pre-cleanup
 */
export const secureSignIn = async (email: string, password: string) => {
  try {
    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing session
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      // Continue even if this fails
      console.warn('Pre-signin cleanup failed, continuing:', error);
    }
    
    // Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Force page reload for clean state
      window.location.href = '/';
      return { data, error: null };
    }
    
    return { data, error };
  } catch (error) {
    console.error('Secure sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Enhanced sign up with proper redirect handling
 */
export const secureSignUp = async (email: string, password: string, metadata?: any) => {
  try {
    // Clean up existing state first
    cleanupAuthState();
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    
    return { data, error };
  } catch (error) {
    console.error('Secure sign up error:', error);
    return { data: null, error };
  }
};
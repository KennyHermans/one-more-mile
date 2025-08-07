import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WishlistItem {
  id: string;
  trip_id: string;
  notes?: string;
  created_at: string;
}

export function useWishlist(userId?: string) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchWishlist = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_wishlists')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (tripId: string) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add trips to your wishlist.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('customer_wishlists')
        .insert([{
          user_id: userId,
          trip_id: tripId,
          notes: ''
        }]);

      if (error) throw error;

      // Update local state
      const newItem: WishlistItem = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        notes: '',
        created_at: new Date().toISOString()
      };
      setWishlistItems(prev => [...prev, newItem]);

      toast({
        title: "Added to wishlist",
        description: "Trip added to your wishlist successfully.",
      });
      return true;
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add trip to wishlist. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeFromWishlist = async (tripId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('customer_wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('trip_id', tripId);

      if (error) throw error;

      // Update local state
      setWishlistItems(prev => prev.filter(item => item.trip_id !== tripId));

      toast({
        title: "Removed from wishlist",
        description: "Trip removed from your wishlist.",
      });
      return true;
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove trip from wishlist. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const isInWishlist = (tripId: string) => {
    return wishlistItems.some(item => item.trip_id === tripId);
  };

  useEffect(() => {
    if (userId) {
      fetchWishlist();
    }
  }, [userId]);

  return {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch: fetchWishlist,
  };
}
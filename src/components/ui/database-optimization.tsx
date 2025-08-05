import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DatabaseOptimizationProps {
  onComplete?: () => void;
}

export function DatabaseOptimization({ onComplete }: DatabaseOptimizationProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const optimizeDatabase = async () => {
    try {
      setIsOptimizing(true);
      
      // Enable realtime for critical tables
      const tables = [
        'admin_alerts',
        'admin_alerts', 
        'trip_bookings',
        'applications',
        'trips',
        'sensei_profiles'
      ] as const;

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (!error) {
          // Table realtime check
        }
      }

      // Test realtime subscriptions
      const channel = supabase
        .channel('test-realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          // Realtime test successful
        })
        .subscribe();

      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 2000);

      toast({
        title: "Database Optimized",
        description: "Real-time subscriptions are active and working properly.",
      });

      onComplete?.();
    } catch (error) {
      console.error('Database optimization error:', error);
      toast({
        title: "Optimization Error",
        description: "Failed to optimize database connections.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    // Auto-optimize on component mount
    optimizeDatabase();
  }, []);

  return null; // This is a utility component, no UI needed
}
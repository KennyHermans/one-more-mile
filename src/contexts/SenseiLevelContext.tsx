import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SenseiLevelContextType {
  currentLevel: string | null;
  isLevelChanging: boolean;
  refreshPermissions: () => void;
  lastLevelChange: Date | null;
}

const SenseiLevelContext = createContext<SenseiLevelContextType | undefined>(undefined);

interface SenseiLevelProviderProps {
  children: React.ReactNode;
  senseiId?: string;
}

export const SenseiLevelProvider: React.FC<SenseiLevelProviderProps> = ({ 
  children, 
  senseiId 
}) => {
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [isLevelChanging, setIsLevelChanging] = useState(false);
  const [lastLevelChange, setLastLevelChange] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const refreshPermissions = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!senseiId) return;

    // Initial level fetch
    const fetchInitialLevel = async () => {
      const { data } = await supabase
        .from('sensei_profiles')
        .select('sensei_level')
        .eq('id', senseiId)
        .single();
      
      if (data) {
        setCurrentLevel(data.sensei_level);
      }
    };

    fetchInitialLevel();

    // Set up real-time subscription for level changes
    const channel = supabase
      .channel('sensei-level-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sensei_profiles',
          filter: `id=eq.${senseiId}`
        },
        (payload) => {
          const oldLevel = payload.old?.sensei_level;
          const newLevel = payload.new?.sensei_level;
          
          if (oldLevel !== newLevel) {
            setIsLevelChanging(true);
            setCurrentLevel(newLevel);
            setLastLevelChange(new Date());
            
            // Show toast notification
            toast({
              title: "Level Updated!",
              description: `Your Sensei level has been updated to ${newLevel}. Your permissions have been refreshed.`,
              duration: 5000,
            });

            // Refresh permissions after a short delay
            setTimeout(() => {
              refreshPermissions();
              setIsLevelChanging(false);
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senseiId, toast]);

  return (
    <SenseiLevelContext.Provider value={{
      currentLevel,
      isLevelChanging,
      refreshPermissions,
      lastLevelChange,
    }}>
      {children}
    </SenseiLevelContext.Provider>
  );
};

export const useSenseiLevel = () => {
  const context = useContext(SenseiLevelContext);
  if (context === undefined) {
    throw new Error('useSenseiLevel must be used within a SenseiLevelProvider');
  }
  return context;
};
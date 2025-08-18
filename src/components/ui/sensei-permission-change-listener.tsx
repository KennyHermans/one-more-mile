import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SenseiPermissionChangeListener() {
  const { toast } = useToast();
  const [senseiId, setSenseiId] = useState<string | null>(null);

  // Get current sensei ID
  useEffect(() => {
    const fetchSenseiId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('sensei_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setSenseiId(data.id);
        }
      }
    };

    fetchSenseiId();
  }, []);

  // Listen for permission changes
  useEffect(() => {
    if (!senseiId) return;

    const channels: any[] = [];

    // Listen for level permission changes
    const levelPermissionsChannel = supabase
      .channel('sensei-level-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_level_permissions'
        },
        () => {
          toast({
            title: "Permissions Updated",
            description: "Your permissions were updated by an admin. Some capabilities may have changed.",
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Listen for field permission changes
    const fieldPermissionsChannel = supabase
      .channel('sensei-field-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_level_field_permissions'
        },
        () => {
          toast({
            title: "Field Permissions Updated",
            description: "Your field editing permissions were updated by an admin. Some fields may now be editable or read-only.",
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Listen for trip-specific permission changes
    const tripPermissionsChannel = supabase
      .channel('sensei-trip-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_permissions',
          filter: `sensei_id=eq.${senseiId}`
        },
        (payload) => {
          const eventType = payload.eventType;
          let message = "";
          
          if (eventType === 'INSERT') {
            message = "You've been granted elevated permissions for a specific trip.";
          } else if (eventType === 'DELETE') {
            message = "Your elevated permissions for a trip have been revoked.";
          } else {
            message = "Your trip-specific permissions have been updated.";
          }

          toast({
            title: "Trip Permissions Updated",
            description: message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    channels.push(levelPermissionsChannel, fieldPermissionsChannel, tripPermissionsChannel);

    // Cleanup
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [senseiId, toast]);

  return null; // This component doesn't render anything
}
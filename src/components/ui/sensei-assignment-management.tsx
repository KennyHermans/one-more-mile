// Updated sensei assignment management - combines suggestions and backup
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { SenseiSuggestionsOverview } from "./sensei-suggestions-overview";
import { BackupSenseiManagement } from "./backup-sensei-management";
import { ComprehensiveBackupDashboard } from "./comprehensive-backup-dashboard";
import { UserCheck, UserPlus, Search, AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SenseiAssignmentManagement() {
  // Component loaded

  const handleTriggerBackupAssignment = async () => {
    try {
      // Get trips that need backup sensei
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title')
        .eq('requires_backup_sensei', true)
        .is('backup_sensei_id', null)
        .eq('is_active', true);

      if (!trips || trips.length === 0) {
        toast.info("No trips currently need backup senseis");
        return;
      }

      // Trigger backup assignment for each trip
      for (const trip of trips) {
        await supabase.functions.invoke('trigger-backup-assignment', {
          body: { trip_id: trip.id }
        });
      }

      toast.success(`Triggered backup assignment for ${trips.length} trip(s)`);
    } catch (error) {
      console.error('Error triggering backup assignment:', error);
      toast.error('Failed to trigger backup assignment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sensei Assignment Management</h2>
        <Button onClick={handleTriggerBackupAssignment} variant="outline">
          Trigger Backup Assignment
        </Button>
      </div>
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Sensei Suggestions
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Backup Management
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Backup Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-6 mt-6">
          <SenseiSuggestionsOverview />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6 mt-6">
          <BackupSenseiManagement isAdmin={true} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6 mt-6">
          <ComprehensiveBackupDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
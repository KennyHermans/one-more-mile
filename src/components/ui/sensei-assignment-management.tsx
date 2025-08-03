// Updated sensei assignment management - combines suggestions and backup
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { SenseiSuggestionsOverview } from "./sensei-suggestions-overview";
import { BackupSenseiManagement } from "./backup-sensei-management";
import { AdminBackupAlerts } from "./admin-backup-alerts";
import { UserCheck, UserPlus, Search, AlertTriangle } from "lucide-react";

export function SenseiAssignmentManagement() {
  console.log("SenseiAssignmentManagement component loaded");
  return (
    <div className="space-y-6">
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
          <AdminBackupAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
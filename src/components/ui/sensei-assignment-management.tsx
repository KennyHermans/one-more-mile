import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { SenseiSuggestionsOverview } from "./sensei-suggestions-overview";
import { BackupSenseiManagement } from "./backup-sensei-management";
import { UserCheck, UserPlus, Search } from "lucide-react";

export function SenseiAssignmentManagement() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Sensei Suggestions
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Backup Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-6 mt-6">
          <SenseiSuggestionsOverview />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6 mt-6">
          <BackupSenseiManagement isAdmin={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
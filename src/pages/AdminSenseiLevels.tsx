import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSenseiLevelConfiguration } from "@/components/ui/admin-sensei-level-configuration";
import { EnhancedAdminSenseiLevelOverview } from "@/components/ui/enhanced-admin-sensei-level-overview";
import { AdminLevelRequirementsConfig } from "@/components/ui/admin-level-requirements-config";
import { ReadOnlyLevelPermissions } from "@/components/ui/read-only-level-permissions";
import { AutomatedAssignmentSystem } from "@/components/ui/automated-assignment-system";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";
import { AdminTripSpecificPermissions } from "@/components/ui/admin-trip-specific-permissions";


const AdminSenseiLevels = () => {
  return (
    <AdminAccessGuard>
      <div className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Sensei Level Management</h1>
            <p className="text-muted-foreground">
              Configure automatic level progression, requirements, permissions, and manage sensei levels
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="permissions">Permissions (Read-only)</TabsTrigger>
              <TabsTrigger value="trip-permissions">Trip Permissions</TabsTrigger>
              <TabsTrigger value="automation">Assignment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <EnhancedAdminSenseiLevelOverview />
            </TabsContent>

            <TabsContent value="configuration" className="space-y-6">
              <AdminSenseiLevelConfiguration />
            </TabsContent>

            <TabsContent value="requirements" className="space-y-6">
              <AdminLevelRequirementsConfig />
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <ReadOnlyLevelPermissions />
            </TabsContent>

            <TabsContent value="trip-permissions" className="space-y-6">
              <AdminTripSpecificPermissions />
            </TabsContent>

            <TabsContent value="automation" className="space-y-6">
              <div className="grid gap-6">
                <AutomatedAssignmentSystem />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminSenseiLevels;
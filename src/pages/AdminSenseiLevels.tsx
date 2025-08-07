import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSenseiLevelConfiguration } from "@/components/ui/admin-sensei-level-configuration";
import { EnhancedAdminSenseiLevelOverview } from "@/components/ui/enhanced-admin-sensei-level-overview";
import { AdminLevelRequirementsConfig } from "@/components/ui/admin-level-requirements-config";
import { AdminPermissionFieldEditor } from "@/components/ui/admin-permission-field-editor";
import { SmartNotificationSystem } from "@/components/ui/smart-notification-system";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";

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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview & Management</TabsTrigger>
              <TabsTrigger value="configuration">Level Configuration</TabsTrigger>
              <TabsTrigger value="requirements">Requirements Config</TabsTrigger>
              <TabsTrigger value="permissions">Field Permissions</TabsTrigger>
              <TabsTrigger value="automation">Automation & Testing</TabsTrigger>
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
              <AdminPermissionFieldEditor />
            </TabsContent>

            <TabsContent value="automation" className="space-y-6">
              <div className="grid gap-6">
                <SmartNotificationSystem />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminSenseiLevels;
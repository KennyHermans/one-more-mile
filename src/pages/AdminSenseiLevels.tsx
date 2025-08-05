import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSenseiLevelConfiguration } from "@/components/ui/admin-sensei-level-configuration";
import { AdminSenseiLevelOverview } from "@/components/ui/admin-sensei-level-overview";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";

const AdminSenseiLevels = () => {
  return (
    <AdminAccessGuard>
      <div className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Sensei Level Management</h1>
            <p className="text-muted-foreground">
              Configure automatic level progression and manage sensei levels
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview & Management</TabsTrigger>
              <TabsTrigger value="configuration">Level Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AdminSenseiLevelOverview />
            </TabsContent>

            <TabsContent value="configuration" className="space-y-6">
              <AdminSenseiLevelConfiguration />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminSenseiLevels;
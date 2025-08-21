import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboardOverview } from '@/components/ui/admin-dashboard-overview';
import { AdminTripsManagement } from '@/components/ui/admin-trip-management-overview';
import { AdminSenseiManagement } from '@/components/ui/admin-sensei-management';
import { AdminPayoutSettings } from '@/components/ui/admin-payout-settings';
import { AdminAccessGuard } from '@/components/ui/admin-access-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const AdminDashboard = () => {
  return (
    <AdminAccessGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage the platform, users, trips, and system settings.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="senseis">Senseis</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminDashboardOverview />
          </TabsContent>

          <TabsContent value="trips" className="space-y-6">
            <AdminTripsManagement />
          </TabsContent>

          <TabsContent value="senseis" className="space-y-6">
            <AdminSenseiManagement />
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <AdminPayoutSettings />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Here you can manage general settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>This is a placeholder for settings content.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminDashboard;

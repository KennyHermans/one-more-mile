
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboardOverview } from '@/components/ui/admin-dashboard-overview';
import { AdminTripManagementOverview } from '@/components/ui/admin-trip-management-overview';
import { AdminSenseiManagement } from '@/components/ui/admin-sensei-management';
import { AdminPayoutSettings } from '@/components/ui/admin-payout-settings';
import { AdminPaymentSettings } from '@/components/ui/admin-payment-settings';
import { AdminAccessGuard } from '@/components/ui/admin-access-guard';
import { AdminWarrantyDashboard } from '@/components/ui/admin-warranty-dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const AdminDashboard = () => {
  // Mock data for the overview component
  const mockStats = {
    totalTrips: 0,
    activeTrips: 0,
    totalSenseis: 0,
    totalRevenue: 0,
    pendingApplications: 0,
    completedTrips: 0,
    totalApplications: 0,
    tripProposals: 0,
    cancellations: 0
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
  };

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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="senseis">Senseis</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="warranty">Warranty</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminDashboardOverview stats={mockStats} onTabChange={handleTabChange} />
          </TabsContent>

          <TabsContent value="trips" className="space-y-6">
            <AdminTripManagementOverview />
          </TabsContent>

          <TabsContent value="senseis" className="space-y-6">
            <AdminSenseiManagement />
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <AdminPayoutSettings />
          </TabsContent>

          <TabsContent value="warranty" className="space-y-6">
            <AdminWarrantyDashboard />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-4">
              <AdminPaymentSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminAccessGuard>
  );
};

export default AdminDashboard;

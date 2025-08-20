
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SenseiOverviewDashboard } from '@/components/ui/sensei-overview-dashboard';
import { SenseiTripsManagement } from '@/components/ui/sensei-trips-management';
import { SenseiAnalyticsDashboard } from '@/components/ui/sensei-analytics-dashboard';
import { SenseiPayoutsTab } from '@/components/ui/sensei-payouts-tab';

export const SenseiDashboardTabs = () => {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="trips">Trips</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <SenseiOverviewDashboard 
          senseiProfile={null}
          stats={{ activeTrips: 0, completedTrips: 0, upcomingTrips: 0, totalParticipants: 0, rating: 0 }}
          quickActions={[]}
          onTabChange={() => {}}
        />
      </TabsContent>

      <TabsContent value="trips" className="space-y-6">
        <SenseiTripsManagement 
          trips={[]}
          canCreateTrips={false}
          canEditTrips={false}
          onCreateTrip={() => {}}
          onEditTrip={() => {}}
          onCancelTrip={() => {}}
          onDeleteTrip={() => {}}
          onViewTrip={() => {}}
        />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <SenseiAnalyticsDashboard />
      </TabsContent>

      <TabsContent value="payouts" className="space-y-6">
        <SenseiPayoutsTab />
      </TabsContent>
    </Tabs>
  );
};

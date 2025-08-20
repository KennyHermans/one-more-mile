
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SenseiPayoutMethods } from '@/components/ui/sensei-payout-methods';
import { SenseiEarningsDashboard } from '@/components/ui/sensei-earnings-dashboard';

export const SenseiPayoutsTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payouts & Earnings</h2>
        <p className="text-muted-foreground">
          Manage your payout methods and track your earnings from completed trips.
        </p>
      </div>

      <Tabs defaultValue="earnings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="methods">Payout Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-6">
          <SenseiEarningsDashboard />
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <SenseiPayoutMethods />
        </TabsContent>
      </Tabs>
    </div>
  );
};

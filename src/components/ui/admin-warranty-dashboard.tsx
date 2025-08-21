import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertTriangle, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WarrantyMethod {
  id: string;
  sensei_id: string;
  sensei_name: string;
  is_active: boolean;
  created_at: string;
  card_last4: string;
  card_brand: string;
}

interface WarrantyAnalytics {
  totalActiveWarranties: number;
  totalChargesThisMonth: number;
  averageChargeAmount: number;
  senseisCovered: number;
}

export const AdminWarrantyDashboard = () => {
  const [chargeAmount, setChargeAmount] = React.useState('');
  const [chargeReason, setChargeReason] = React.useState('');
  const [selectedSensei, setSelectedSensei] = React.useState<string>('');

  // Fetch warranty methods
  const { data: warrantyMethods, refetch: refetchMethods } = useQuery({
    queryKey: ['admin-warranty-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_warranty_methods')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get sensei names in a separate query since join might not work
      const senseiIds = (data || []).map(method => method.sensei_id);
      const { data: senseiProfiles, error: profilesError } = await supabase
        .from('sensei_profiles')
        .select('id, name')
        .in('id', senseiIds);
      
      if (profilesError) throw profilesError;
      
      const profileMap = (senseiProfiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.name;
        return acc;
      }, {} as Record<string, string>);
      
      return (data || []).map(method => ({
        id: method.id,
        sensei_id: method.sensei_id,
        sensei_name: profileMap[method.sensei_id] || 'Unknown',
        is_active: method.is_active,
        created_at: method.created_at,
        card_last4: method.card_last4,
        card_brand: method.card_brand
      })) as WarrantyMethod[];
    }
  });

  // Fetch warranty charges (placeholder for now)
  const { data: warrantyCharges } = useQuery({
    queryKey: ['admin-warranty-charges'],
    queryFn: async () => {
      // Return empty array for now since the table doesn't exist yet
      return [];
    }
  });

  // Fetch warranty analytics
  const { data: analytics } = useQuery({
    queryKey: ['warranty-analytics'],
    queryFn: async () => {
      // Calculate basic analytics from warranty methods
      const { data: methods, error } = await supabase
        .from('sensei_warranty_methods')
        .select('id')
        .eq('is_active', true);
      
      if (error) throw error;
      
      return {
        totalActiveWarranties: methods?.length || 0,
        totalChargesThisMonth: 0,
        averageChargeAmount: 0,
        senseisCovered: methods?.length || 0
      } as WarrantyAnalytics;
    }
  });

  // Charge warranty mutation
  const chargeWarrantyMutation = useMutation({
    mutationFn: async ({ senseiId, amount, reason }: { senseiId: string; amount: number; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('warranty-charge-sensei', {
        body: { sensei_id: senseiId, amount, reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Warranty charge processed successfully" });
      refetchMethods();
      setChargeAmount('');
      setChargeReason('');
      setSelectedSensei('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process warranty charge",
        variant: "destructive"
      });
    }
  });

  const handleChargeWarranty = () => {
    if (!selectedSensei || !chargeAmount || !chargeReason) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    
    const amount = parseInt(chargeAmount) * 100; // Convert to cents
    chargeWarrantyMutation.mutate({ senseiId: selectedSensei, amount, reason: chargeReason });
  };

  const stats = analytics || {
    totalActiveWarranties: warrantyMethods?.length || 0,
    totalChargesThisMonth: 0,
    averageChargeAmount: 0,
    senseisCovered: warrantyMethods?.length || 0
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Warranty Management</h2>
        <p className="text-muted-foreground">
          Monitor and manage Sensei warranty methods and charges.
        </p>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveWarranties}</div>
            <p className="text-xs text-muted-foreground">Payment methods on file</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Charges</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalChargesThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Charge</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.averageChargeAmount}</div>
            <p className="text-xs text-muted-foreground">Per incident</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senseis Covered</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.senseisCovered}</div>
            <p className="text-xs text-muted-foreground">With warranty setup</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="methods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="methods">Warranty Methods</TabsTrigger>
          <TabsTrigger value="charges">Recent Charges</TabsTrigger>
          <TabsTrigger value="charge-new">Charge Warranty</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Warranty Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warrantyMethods?.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{method.sensei_name}</div>
                      <div className="text-sm text-muted-foreground">
                        •••• •••• •••• {method.card_last4} ({method.card_brand})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Setup: {new Date(method.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={method.is_active ? "default" : "secondary"}>
                        {method.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Setup: Active
                      </div>
                    </div>
                  </div>
                ))}
                
                {!warrantyMethods?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No warranty methods found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Warranty Charges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No warranty charges found. Charge functionality will be available once the warranty system is fully deployed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charge-new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Charge Sensei Warranty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Use this carefully. Warranty charges are for serious incidents like no-shows, 
                  trip cancellations, or policy violations.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Sensei</label>
                  <select 
                    value={selectedSensei} 
                    onChange={(e) => setSelectedSensei(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="">Choose a sensei...</option>
                    {warrantyMethods?.map((method) => (
                      <option key={method.sensei_id} value={method.sensei_id}>
                        {method.sensei_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Amount (EUR)</label>
                  <Input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="Enter amount in euros"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    value={chargeReason}
                    onChange={(e) => setChargeReason(e.target.value)}
                    placeholder="Detailed reason for the warranty charge..."
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleChargeWarranty}
                  disabled={chargeWarrantyMutation.isPending}
                  className="w-full"
                >
                  {chargeWarrantyMutation.isPending ? "Processing..." : "Process Warranty Charge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
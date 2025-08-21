import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CreditCard, AlertTriangle, CheckCircle2, Clock, Euro, User } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface SenseiWarranty {
  sensei_id: string;
  sensei_name: string;
  warranty_method: {
    id: string;
    card_brand: string;
    card_last4: string;
    card_exp_month: number;
    card_exp_year: number;
    is_active: boolean;
    created_at: string;
  } | null;
  total_charges: number;
  recent_charges: Array<{
    id: string;
    amount_charged: number;
    charge_reason: string;
    charge_status: string;
    created_at: string;
  }>;
}

export const AdminWarrantyManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [selectedSensei, setSelectedSensei] = useState<SenseiWarranty | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeReason, setChargeReason] = useState('');

  // Fetch senseis with warranty methods
  const { data: senseiWarranties, isLoading } = useQuery({
    queryKey: ['admin-sensei-warranties'],
    queryFn: async () => {
      const { data: senseis, error: senseisError } = await supabase
        .from('sensei_profiles')
        .select('id, name, is_active')
        .eq('is_active', true);

      if (senseisError) throw senseisError;

      const warranties: SenseiWarranty[] = [];

      for (const sensei of senseis) {
        // Get warranty method
        const { data: warrantyMethod } = await supabase
          .from('sensei_warranty_methods')
          .select('*')
          .eq('sensei_id', sensei.id)
          .eq('is_active', true)
          .maybeSingle();

        // Get charges
        const { data: charges = [] } = await supabase
          .from('sensei_warranty_charges')
          .select('*')
          .eq('sensei_id', sensei.id)
          .order('created_at', { ascending: false })
          .limit(3);

        const totalCharges = charges.reduce((sum, charge) => 
          charge.charge_status === 'succeeded' ? sum + charge.amount_charged : sum, 0
        );

        warranties.push({
          sensei_id: sensei.id,
          sensei_name: sensei.name,
          warranty_method: warrantyMethod,
          total_charges: totalCharges,
          recent_charges: charges,
        });
      }

      return warranties;
    },
  });

  // Get warranty settings
  const { data: warrantySettings } = useQuery({
    queryKey: ['admin-warranty-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_warranty_settings');
      if (error) throw error;
      return data;
    },
  });

  // Charge sensei mutation
  const chargeSensei = useMutation({
    mutationFn: async ({ senseiId, amount, reason }: { senseiId: string; amount: number; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('warranty-charge-sensei', {
        body: {
          sensei_id: senseiId,
          amount: amount * 100, // Convert to cents
          reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sensei-warranties'] });
      setChargeDialogOpen(false);
      setSelectedSensei(null);
      setChargeAmount('');
      setChargeReason('');
      toast({
        title: 'Success',
        description: 'Warranty charge processed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process warranty charge.',
        variant: 'destructive',
      });
    },
  });

  const handleChargeClick = (sensei: SenseiWarranty) => {
    setSelectedSensei(sensei);
    setChargeDialogOpen(true);
  };

  const handleSubmitCharge = () => {
    if (!selectedSensei || !chargeAmount || !chargeReason) return;

    const amount = parseFloat(chargeAmount);
    const maxAmount = ((warrantySettings as any)?.max_amount?.amount || 50000) / 100;

    if (amount > maxAmount) {
      toast({
        title: 'Error',
        description: `Amount exceeds maximum warranty limit of €${maxAmount}`,
        variant: 'destructive',
      });
      return;
    }

    chargeSensei.mutate({
      senseiId: selectedSensei.sensei_id,
      amount,
      reason: chargeReason,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warranty Management</h2>
          <p className="text-muted-foreground">
            Manage sensei warranty cards and process charges.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Maximum charge: €{((warrantySettings as any)?.max_amount?.amount || 50000) / 100}
        </div>
      </div>

      <div className="grid gap-4">
        {senseiWarranties?.map((sensei) => (
          <Card key={sensei.sensei_id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <h3 className="font-semibold">{sensei.sensei_name}</h3>
                  </div>

                  {sensei.warranty_method ? (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">
                        {sensei.warranty_method.card_brand} •••• {sensei.warranty_method.card_last4}
                      </span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">No warranty card</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Total charged: €{(sensei.total_charges / 100).toFixed(2)}
                  </div>
                </div>

                <div className="flex gap-2">
                  {sensei.warranty_method && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChargeClick(sensei)}
                      disabled={chargeSensei.isPending}
                    >
                      <Euro className="h-4 w-4 mr-1" />
                      Charge
                    </Button>
                  )}
                </div>
              </div>

              {sensei.recent_charges.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Recent Charges</h4>
                  {sensei.recent_charges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(charge.charge_status)}
                        <span>€{(charge.amount_charged / 100).toFixed(2)}</span>
                        <Badge variant="outline" className={getStatusColor(charge.charge_status)}>
                          {charge.charge_status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {formatDistance(new Date(charge.created_at), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charge Dialog */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Charge Warranty</DialogTitle>
            <DialogDescription>
              Charge {selectedSensei?.sensei_name}'s warranty card for violations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                max={((warrantySettings as any)?.max_amount?.amount || 50000) / 100}
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <Label htmlFor="reason">Reason for Charge</Label>
              <Textarea
                id="reason"
                value={chargeReason}
                onChange={(e) => setChargeReason(e.target.value)}
                placeholder="Describe the violation or reason for this charge..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={!chargeAmount || !chargeReason || chargeSensei.isPending}
                >
                  Charge €{chargeAmount || '0.00'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Warranty Charge</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to charge €{chargeAmount} to {selectedSensei?.sensei_name}'s warranty card.
                    This action cannot be undone. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitCharge}>
                    Confirm Charge
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
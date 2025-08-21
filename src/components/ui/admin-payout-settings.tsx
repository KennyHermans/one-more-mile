
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Percent, Clock, DollarSign } from 'lucide-react';

interface PaymentSetting {
  id: string;
  setting_name: string;
  setting_value: any;
  description: string;
  created_at: string;
  updated_at: string;
}

export const AdminPayoutSettings = () => {
  const queryClient = useQueryClient();
  const [commissionRates, setCommissionRates] = useState({
    apprentice: 80,
    journey_guide: 80,
    master_sensei: 90
  });
  const [advanceRates, setAdvanceRates] = useState({
    apprentice: 0,
    journey_guide: 10,
    master_sensei: 10
  });
  const [payoutDelay, setPayoutDelay] = useState({
    min: 7,
    max: 14
  });

  // Fetch current payment settings
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .in('setting_name', ['sensei_commission_percents', 'advance_payout_percents', 'payout_delay_days'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentSetting[];
    },
    onSuccess: (data) => {
      // Load current values into state
      data.forEach(setting => {
        if (setting.setting_name === 'sensei_commission_percents') {
          setCommissionRates(setting.setting_value);
        } else if (setting.setting_name === 'advance_payout_percents') {
          setAdvanceRates(setting.setting_value);
        } else if (setting.setting_name === 'payout_delay_days') {
          setPayoutDelay(setting.setting_value);
        }
      });
    }
  });

  // Update payment settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: { settingName: string; value: any; description: string }[]) => {
      const promises = updates.map(update => 
        supabase
          .from('payment_settings')
          .insert({
            setting_name: update.settingName,
            setting_value: update.value,
            description: update.description
          })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update settings: ${errors[0].error?.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast.success('Payment settings updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update settings: ' + error.message);
    }
  });

  const handleSaveSettings = () => {
    const updates = [
      {
        settingName: 'sensei_commission_percents',
        value: commissionRates,
        description: 'Commission percent by sensei level; platform keeps (100 - value)%'
      },
      {
        settingName: 'advance_payout_percents',
        value: advanceRates,
        description: 'Advance payout percent by level, unlocked when trip reaches min_participants'
      },
      {
        settingName: 'payout_delay_days',
        value: payoutDelay,
        description: 'Wait window after trip end before triggering final payout'
      }
    ];

    updateSettings.mutate(updates);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payout Settings</h2>
        <p className="text-muted-foreground">
          Configure commission rates, advance payouts, and payout timing for different Sensei levels.
        </p>
      </div>

      {/* Commission Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Percent className="h-5 w-5" />
            <CardTitle>Commission Rates</CardTitle>
          </div>
          <CardDescription>
            Set the percentage of trip revenue that Senseis earn by level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="apprentice-commission">Apprentice</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="apprentice-commission"
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.apprentice}
                  onChange={(e) => setCommissionRates({
                    ...commissionRates,
                    apprentice: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="journey-commission">Journey Guide</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="journey-commission"
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.journey_guide}
                  onChange={(e) => setCommissionRates({
                    ...commissionRates,
                    journey_guide: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="master-commission">Master Sensei</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="master-commission"
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.master_sensei}
                  onChange={(e) => setCommissionRates({
                    ...commissionRates,
                    master_sensei: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advance Payout Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Advance Payout Rates</CardTitle>
          </div>
          <CardDescription>
            Percentage of commission paid in advance when trip reaches minimum bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="apprentice-advance">Apprentice</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="apprentice-advance"
                  type="number"
                  min="0"
                  max="50"
                  value={advanceRates.apprentice}
                  onChange={(e) => setAdvanceRates({
                    ...advanceRates,
                    apprentice: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="journey-advance">Journey Guide</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="journey-advance"
                  type="number"
                  min="0"
                  max="50"
                  value={advanceRates.journey_guide}
                  onChange={(e) => setAdvanceRates({
                    ...advanceRates,
                    journey_guide: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="master-advance">Master Sensei</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="master-advance"
                  type="number"
                  min="0"
                  max="50"
                  value={advanceRates.master_sensei}
                  onChange={(e) => setAdvanceRates({
                    ...advanceRates,
                    master_sensei: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Timing */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Payout Timing</CardTitle>
          </div>
          <CardDescription>
            Configure how long to wait after trip completion before processing final payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-delay">Minimum Days</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="min-delay"
                  type="number"
                  min="1"
                  max="30"
                  value={payoutDelay.min}
                  onChange={(e) => setPayoutDelay({
                    ...payoutDelay,
                    min: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
            <div>
              <Label htmlFor="max-delay">Maximum Days</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="max-delay"
                  type="number"
                  min="1"
                  max="30"
                  value={payoutDelay.max}
                  onChange={(e) => setPayoutDelay({
                    ...payoutDelay,
                    max: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettings.isPending}
          className="min-w-32"
        >
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Settings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Commission Rates</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Apprentice:</span>
                  <Badge variant="secondary">{commissionRates.apprentice}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Journey Guide:</span>
                  <Badge variant="secondary">{commissionRates.journey_guide}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Master Sensei:</span>
                  <Badge variant="secondary">{commissionRates.master_sensei}%</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advance Payouts</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Apprentice:</span>
                  <Badge variant="outline">{advanceRates.apprentice}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Journey Guide:</span>
                  <Badge variant="outline">{advanceRates.journey_guide}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Master Sensei:</span>
                  <Badge variant="outline">{advanceRates.master_sensei}%</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Payout Timing</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Minimum:</span>
                  <Badge variant="outline">{payoutDelay.min} days</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Maximum:</span>
                  <Badge variant="outline">{payoutDelay.max} days</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

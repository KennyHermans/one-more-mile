
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Percent, Clock, DollarSign, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

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
  const [senseiCommissionRates, setSenseiCommissionRates] = useState({
    apprentice: 80,
    journey_guide: 80,
    master_sensei: 90
  });
  const [platformCommissionRates, setPlatformCommissionRates] = useState({
    apprentice: 20,
    journey_guide: 20,
    master_sensei: 10
  });
  const [advanceRates, setAdvanceRates] = useState({
    apprentice: 0,
    journey_guide: 10,
    master_sensei: 10
  });
  const [day1Rates, setDay1Rates] = useState({
    apprentice: 40,
    journey_guide: 40,
    master_sensei: 40
  });
  const [payoutDelay, setPayoutDelay] = useState({
    min: 7,
    max: 14
  });

  // Fetch current payment settings using the new RPC
  const { data: payoutSettings, isLoading } = useQuery({
    queryKey: ['payout-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_payout_settings');
      if (error) throw error;
      return data;
    }
  });

  // Load settings into state when data is fetched
  useEffect(() => {
    if (payoutSettings) {
      if (payoutSettings.sensei_commission_percents) {
        setSenseiCommissionRates(payoutSettings.sensei_commission_percents);
      }
      if (payoutSettings.platform_commission_percents) {
        setPlatformCommissionRates(payoutSettings.platform_commission_percents);
      }
      if (payoutSettings.advance_payout_percents) {
        setAdvanceRates(payoutSettings.advance_payout_percents);
      }
      if (payoutSettings.day1_payout_percents) {
        setDay1Rates(payoutSettings.day1_payout_percents);
      }
      if (payoutSettings.payout_delay_days) {
        setPayoutDelay(payoutSettings.payout_delay_days);
      }
    }
  }, [payoutSettings]);

  // Validation function
  const validateRates = () => {
    const levels = ['apprentice', 'journey_guide', 'master_sensei'];
    for (const level of levels) {
      const senseiRate = senseiCommissionRates[level];
      const platformRate = platformCommissionRates[level];
      const advanceRate = advanceRates[level];
      const day1Rate = day1Rates[level];

      // Check if sensei + platform = 100%
      if (senseiRate + platformRate !== 100) {
        throw new Error(`${level}: Sensei commission (${senseiRate}%) + Platform commission (${platformRate}%) must equal 100%`);
      }

      // Check if advance + day1 <= 100%
      if (advanceRate + day1Rate > 100) {
        throw new Error(`${level}: Advance (${advanceRate}%) + Day 1 (${day1Rate}%) cannot exceed 100% of sensei commission`);
      }
    }
  };

  // Update payment settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: { settingName: string; value: any; description: string }[]) => {
      // Validate before saving
      validateRates();

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
      queryClient.invalidateQueries({ queryKey: ['payout-settings'] });
      toast.success('Payment settings updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update settings: ' + error.message);
    }
  });

  const handleSaveSettings = () => {
    try {
      const updates = [
        {
          settingName: 'sensei_commission_percents',
          value: senseiCommissionRates,
          description: 'Commission percent Senseis earn by level'
        },
        {
          settingName: 'platform_commission_percents',
          value: platformCommissionRates,
          description: 'Platform commission percent by level'
        },
        {
          settingName: 'advance_payout_percents',
          value: advanceRates,
          description: 'Advance payout percent by level (of sensei commission), unlocked when trip reaches min_participants'
        },
        {
          settingName: 'day1_payout_percents',
          value: day1Rates,
          description: 'Day 1 payout percent by level (of sensei commission), paid when trip starts'
        },
        {
          settingName: 'payout_delay_days',
          value: payoutDelay,
          description: 'Wait window after trip end before triggering final payout'
        }
      ];

      updateSettings.mutate(updates);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Calculate final payout percentages
  const getFinalPayoutPercent = (level: string) => {
    return 100 - advanceRates[level] - day1Rates[level];
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
          Configure commission rates and three-stage payout system for different Sensei levels.
        </p>
      </div>

      {/* Commission Split */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Revenue Split by Level</CardTitle>
          </div>
          <CardDescription>
            Configure how trip revenue is split between Senseis and the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['apprentice', 'journey_guide', 'master_sensei'].map((level) => (
              <div key={level} className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium text-center capitalize">
                  {level.replace('_', ' ')}
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`${level}-sensei-commission`}>Sensei Commission</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`${level}-sensei-commission`}
                        type="number"
                        min="0"
                        max="100"
                        value={senseiCommissionRates[level]}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value);
                          setSenseiCommissionRates(prev => ({
                            ...prev,
                            [level]: newValue
                          }));
                          // Auto-adjust platform commission
                          setPlatformCommissionRates(prev => ({
                            ...prev,
                            [level]: 100 - newValue
                          }));
                        }}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`${level}-platform-commission`}>Platform Commission</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`${level}-platform-commission`}
                        type="number"
                        min="0"
                        max="100"
                        value={platformCommissionRates[level]}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value);
                          setPlatformCommissionRates(prev => ({
                            ...prev,
                            [level]: newValue
                          }));
                          // Auto-adjust sensei commission
                          setSenseiCommissionRates(prev => ({
                            ...prev,
                            [level]: 100 - newValue
                          }));
                        }}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Total: {senseiCommissionRates[level] + platformCommissionRates[level]}%
                    {senseiCommissionRates[level] + platformCommissionRates[level] !== 100 && 
                      <span className="text-destructive ml-1">⚠️ Must equal 100%</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Three-Stage Payout System */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Three-Stage Payout System</CardTitle>
          </div>
          <CardDescription>
            Configure when and how much Senseis get paid throughout the trip lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stage 1: Advance Payout */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50">1</Badge>
              <h4 className="font-medium">Advance Payout (When minimum bookings reached)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              {['apprentice', 'journey_guide', 'master_sensei'].map((level) => (
                <div key={level}>
                  <Label htmlFor={`${level}-advance`} className="capitalize">
                    {level.replace('_', ' ')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id={`${level}-advance`}
                      type="number"
                      min="0"
                      max="50"
                      value={advanceRates[level]}
                      onChange={(e) => setAdvanceRates(prev => ({
                        ...prev,
                        [level]: parseInt(e.target.value)
                      }))}
                    />
                    <span className="text-sm text-muted-foreground">% of commission</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Stage 2: Day 1 Payout */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50">2</Badge>
              <h4 className="font-medium">Day 1 Payout (When trip starts)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              {['apprentice', 'journey_guide', 'master_sensei'].map((level) => (
                <div key={level}>
                  <Label htmlFor={`${level}-day1`} className="capitalize">
                    {level.replace('_', ' ')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id={`${level}-day1`}
                      type="number"
                      min="0"
                      max="80"
                      value={day1Rates[level]}
                      onChange={(e) => setDay1Rates(prev => ({
                        ...prev,
                        [level]: parseInt(e.target.value)
                      }))}
                    />
                    <span className="text-sm text-muted-foreground">% of commission</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Stage 3: Final Payout */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-purple-50">3</Badge>
              <h4 className="font-medium">Final Payout (After trip completion)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              {['apprentice', 'journey_guide', 'master_sensei'].map((level) => (
                <div key={level} className="text-center p-3 bg-muted rounded">
                  <div className="font-medium capitalize">{level.replace('_', ' ')}</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {getFinalPayoutPercent(level)}%
                  </div>
                  <div className="text-sm text-muted-foreground">remaining commission</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Timing */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Final Payout Timing</CardTitle>
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
                  onChange={(e) => setPayoutDelay(prev => ({
                    ...prev,
                    min: parseInt(e.target.value)
                  }))}
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
                  onChange={(e) => setPayoutDelay(prev => ({
                    ...prev,
                    max: parseInt(e.target.value)
                  }))}
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
          <CardTitle className="text-lg">Payout Summary by Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['apprentice', 'journey_guide', 'master_sensei'].map((level) => (
              <div key={level} className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium capitalize text-center">{level.replace('_', ' ')}</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sensei Commission:</span>
                    <Badge variant="secondary">{senseiCommissionRates[level]}%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Commission:</span>
                    <Badge variant="outline">{platformCommissionRates[level]}%</Badge>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="space-y-1">
                    <div className="font-medium text-xs text-muted-foreground">PAYOUT STAGES</div>
                    <div className="flex justify-between">
                      <span>📋 Advance:</span>
                      <Badge variant="outline" className="text-blue-600">{advanceRates[level]}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>🚀 Day 1:</span>
                      <Badge variant="outline" className="text-green-600">{day1Rates[level]}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Final:</span>
                      <Badge variant="outline" className="text-purple-600">{getFinalPayoutPercent(level)}%</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

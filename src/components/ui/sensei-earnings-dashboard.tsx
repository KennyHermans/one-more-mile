
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Euro, TrendingUp, Clock, CheckCircle, Download, CreditCard, Zap, Calendar, Target, Wifi } from 'lucide-react';
import { useSenseiPayouts } from '@/hooks/use-sensei-payouts';
import { SenseiStripeConnect } from '@/components/ui/sensei-stripe-connect';
import { RealTimeNotifications } from './real-time-notifications';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const SenseiEarningsDashboard = () => {
  const { earningsSummary, payouts, isLoading } = useSenseiPayouts();
  const { isConnected } = useRealtimeNotifications();
  const queryClient = useQueryClient();

  // Real-time updates for payouts
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get sensei profile
      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      const channel = supabase
        .channel('sensei-payout-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sensei_payouts',
            filter: `sensei_id=eq.${senseiProfile.id}`
          },
          () => {
            // Refresh payout data when changes occur
            queryClient.invalidateQueries({ queryKey: ['sensei-payouts'] });
            queryClient.invalidateQueries({ queryKey: ['sensei-earnings-summary'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    getUser();
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPayoutTypeIcon = (type: string) => {
    switch (type) {
      case 'advance':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'day1':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'final':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Euro className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPayoutTypeName = (type: string) => {
    switch (type) {
      case 'advance':
        return 'Advance';
      case 'day1':
        return 'Day 1';
      case 'final':
        return 'Final';
      default:
        return 'Regular';
    }
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Separate payouts by type
  const advancePayouts = payouts.filter(p => p.payout_type === 'advance');
  const day1Payouts = payouts.filter(p => p.payout_type === 'day1');
  const finalPayouts = payouts.filter(p => p.payout_type === 'final' || !p.payout_type);

  // Calculate three-stage breakdown
  const advanceTotal = advancePayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const day1Total = day1Payouts.reduce((sum, p) => sum + p.net_amount, 0);
  const finalTotal = finalPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPaid = advanceTotal + day1Total + finalTotal;

  return (
    <div className="space-y-6">
      {/* Header with real-time notifications */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Earnings Dashboard</h2>
          {isConnected && (
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Live Updates
            </Badge>
          )}
        </div>
        <RealTimeNotifications />
      </div>

      {/* Stripe Connect Setup */}
      <SenseiStripeConnect />

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {earningsSummary ? formatCurrency(earningsSummary.total_earnings) : '€0.00'}
              </span>
              {earningsSummary && (
                <p className="text-xs text-muted-foreground mt-1">
                  {earningsSummary.commission_percent}% of {formatCurrency(earningsSummary.total_gross)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Balance Due</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {earningsSummary ? formatCurrency(earningsSummary.balance_due) : '€0.00'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Payouts</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {payouts.length}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                across all stages
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Three-Stage Payout Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Three-Stage Payout Breakdown</CardTitle>
          <CardDescription>
            Track your earnings across the complete trip payout lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 1: Advance */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Target className="h-3 w-3 mr-1" />
                  Stage 1
                </Badge>
                <span className="font-medium">Advance Payout</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(advanceTotal)}
              </div>
              <div className="text-sm text-muted-foreground">
                {advancePayouts.length} payment{advancePayouts.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                Paid when minimum bookings reached
              </div>
              {advancePayouts.length > 0 && (
                <Progress 
                  value={100} 
                  className="h-2 bg-blue-100"
                />
              )}
            </div>

            {/* Stage 2: Day 1 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Calendar className="h-3 w-3 mr-1" />
                  Stage 2
                </Badge>
                <span className="font-medium">Day 1 Payout</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(day1Total)}
              </div>
              <div className="text-sm text-muted-foreground">
                {day1Payouts.length} payment{day1Payouts.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                Paid when trip starts
              </div>
              {day1Payouts.length > 0 && (
                <Progress 
                  value={100} 
                  className="h-2 bg-green-100"
                />
              )}
            </div>

            {/* Stage 3: Final */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Stage 3
                </Badge>
                <span className="font-medium">Final Payout</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(finalTotal)}
              </div>
              <div className="text-sm text-muted-foreground">
                {finalPayouts.length} payment{finalPayouts.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                Paid 7-14 days after trip completion
              </div>
              {finalPayouts.length > 0 && (
                <Progress 
                  value={100} 
                  className="h-2 bg-purple-100"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your complete payout timeline across all stages</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <Euro className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-semibold mb-2">No payouts yet</h4>
              <p className="text-sm text-muted-foreground">
                Your payouts will appear here as trips progress through different stages
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getPayoutTypeIcon(payout.payout_type || 'final')}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatCurrency(payout.net_amount, payout.currency)}</span>
                        <Badge className={getStatusColor(payout.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(payout.status)}
                            <span className="capitalize">{payout.status}</span>
                          </div>
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`${
                            payout.payout_type === 'advance' ? 'text-blue-600 border-blue-200' :
                            payout.payout_type === 'day1' ? 'text-green-600 border-green-200' :
                            'text-purple-600 border-purple-200'
                          }`}
                        >
                          {getPayoutTypeName(payout.payout_type || 'final')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payout.period_start && payout.period_end ? (
                          <>Period: {formatDate(payout.period_start)} - {formatDate(payout.period_end)}</>
                        ) : (
                          <>Created: {formatDate(payout.created_at)}</>
                        )}
                      </div>
                      {payout.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {payout.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Gross: {formatCurrency(payout.gross_amount, payout.currency)}
                    </div>
                    {payout.platform_fee > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Platform fee: -{formatCurrency(payout.platform_fee, payout.currency)}
                      </div>
                    )}
                    {payout.paid_at && (
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatDate(payout.paid_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Flow Information */}
      <Card>
        <CardHeader>
          <CardTitle>Three-Stage Payment System</CardTitle>
          <CardDescription>
            Understanding how and when you get paid throughout the trip lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span>1. Advance Payout</span>
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Paid automatically when your trip reaches minimum participants. Helps cover preparation costs and materials.
              </p>
              <div className="text-xs text-blue-600 font-medium">
                Typically 0-10% of your commission
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span>2. Day 1 Payout</span>
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Released on the day your trip starts. Provides cash flow during the trip for expenses and confidence.
              </p>
              <div className="text-xs text-green-600 font-medium">
                Typically 40% of your commission
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-purple-500" />
                <span>3. Final Payout</span>
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Remaining balance paid 7-14 days after trip completion, once everything is finalized and reviewed.
              </p>
              <div className="text-xs text-purple-600 font-medium">
                Remaining 50-60% of your commission
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <h5 className="font-medium mb-1">Processing Time</h5>
                <p className="text-muted-foreground">
                  Bank transfers typically take 1-3 business days to appear in your account via Stripe Connect.
                </p>
              </div>
              <div>
                <h5 className="font-medium mb-1">Tax Information</h5>
                <p className="text-muted-foreground">
                  You're responsible for reporting earnings to tax authorities. Annual statements available in January.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { RealTimePayoutMonitor } from './real-time-payout-monitor';

interface DashboardMetrics {
  totalPayouts: number;
  pendingPayouts: number;
  totalRevenue: number;
  activeSenseis: number;
  recentActivity: any[];
}

export const EnhancedRealTimeDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPayouts: 0,
    pendingPayouts: 0,
    totalRevenue: 0,
    activeSenseis: 0,
    recentActivity: [],
  });

  // Fetch dashboard metrics
  const { data: payoutData } = useQuery({
    queryKey: ['admin-payout-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_payouts')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: senseiData } = useQuery({
    queryKey: ['admin-sensei-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Real-time updates
  useEffect(() => {
    const payoutChannel = supabase
      .channel('payout-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensei_payouts'
        },
        () => {
          // Metrics will be recalculated on next query refetch
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(payoutChannel);
    };
  }, []);

  // Calculate metrics when data updates
  useEffect(() => {
    if (payoutData && senseiData) {
      const totalPayouts = payoutData.length;
      const pendingPayouts = payoutData.filter(p => p.status === 'pending').length;
      const totalRevenue = payoutData
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const activeSenseis = senseiData.length;

      setMetrics({
        totalPayouts,
        pendingPayouts,
        totalRevenue,
        activeSenseis,
        recentActivity: payoutData?.slice(-5) || [],
      });
    }
  }, [payoutData, senseiData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Real-time metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPayouts}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="px-1">Live</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.pendingPayouts}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {metrics.pendingPayouts > 0 && <AlertCircle className="h-3 w-3" />}
              Requires attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Processed payouts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Senseis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.activeSenseis}</div>
            <div className="text-xs text-muted-foreground">Currently onboarded</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time payout monitor */}
      <RealTimePayoutMonitor />

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recent Payout Activity
            <Badge variant="outline" className="text-xs">Live Updates</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recentActivity.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div>
                    <div className="font-medium">
                      {payout.payout_type} payout
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(payout.net_amount)}
                    </div>
                  </div>
                  <Badge
                    variant={payout.status === 'paid' ? 'default' : 'secondary'}
                  >
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
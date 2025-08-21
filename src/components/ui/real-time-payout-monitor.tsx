import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, AlertTriangle, CheckCircle, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface PayoutAutomationStatus {
  id: string;
  trip_id: string;
  sensei_id: string;
  payout_type: string;
  scheduled_for: string;
  status: string;
  attempts: number;
  last_attempt_at?: string;
  error_message?: string;
}

export const RealTimePayoutMonitor = () => {
  const [isMonitoringActive, setIsMonitoringActive] = useState(true);
  const queryClient = useQueryClient();

  // Fetch scheduled payouts
  const { data: scheduledPayouts, isLoading } = useQuery({
    queryKey: ['scheduled-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_automation_status')
        .select(`
          *,
          trips:trip_id (title, destination),
          sensei_profiles:sensei_id (name)
        `)
        .order('scheduled_for', { ascending: true });
      
      if (error) throw error;
      return data as PayoutAutomationStatus[];
    },
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async ({ payoutId, tripId, senseiId, payoutType }: {
      payoutId: string;
      tripId: string;
      senseiId: string;
      payoutType: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-sensei-payouts', {
        body: {
          trip_id: tripId,
          payout_type: payoutType,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payouts'] });
      toast.success('Payout processed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to process payout: ' + error.message);
    },
  });

  // Real-time updates
  useEffect(() => {
    if (!isMonitoringActive) return;

    const channel = supabase
      .channel('payout-automation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payout_automation_status'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['scheduled-payouts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMonitoringActive, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'processing': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getPayoutTypeIcon = (type: string) => {
    switch (type) {
      case 'advance': return '🚀';
      case 'day1': return '📅';
      case 'final': return '✅';
      default: return '💰';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Payout Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Real-Time Payout Monitor</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoringActive ? "default" : "secondary"}>
            {isMonitoringActive ? 'Live' : 'Paused'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoringActive(!isMonitoringActive)}
          >
            {isMonitoringActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {scheduledPayouts?.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No scheduled payouts at the moment
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledPayouts?.slice(0, 10).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getPayoutTypeIcon(payout.payout_type)}</span>
                  <div>
                    <div className="font-medium">
                      {/* @ts-ignore */}
                      {payout.trips?.title || 'Unknown Trip'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {/* @ts-ignore */}
                      Sensei: {payout.sensei_profiles?.name || 'Unknown'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge className={getStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {new Date(payout.scheduled_for).toLocaleDateString()}
                    </div>
                  </div>

                  {payout.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processPayoutMutation.mutate({
                        payoutId: payout.id,
                        tripId: payout.trip_id,
                        senseiId: payout.sensei_id,
                        payoutType: payout.payout_type,
                      })}
                      disabled={processPayoutMutation.isPending}
                    >
                      Process Now
                    </Button>
                  )}

                  {payout.error_message && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
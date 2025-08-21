
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Euro, TrendingUp, Calendar, CheckCircle, Target, Download, Filter, Play } from 'lucide-react';
import { RealTimeNotifications } from './real-time-notifications';
import { EnhancedRealTimeDashboard } from './enhanced-real-time-dashboard';

interface PayoutWithDetails {
  id: string;
  sensei_id: string;
  trip_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  status: string;
  payout_type: string;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  commission_percent: number | null;
  sensei_profiles: {
    name: string;
    sensei_level: string;
  } | null;
  trips: {
    title: string;
    destination: string;
  } | null;
}

export const AdminPayoutsOverview = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all payouts with related data
  const { data: payouts, isLoading } = useQuery({
    queryKey: ['admin-payouts', statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('sensei_payouts')
        .select(`
          *,
          sensei_profiles!inner(name, sensei_level),
          trips!inner(title, destination)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('payout_type', typeFilter);
      }

      if (searchTerm) {
        query = query.or(`sensei_profiles.name.ilike.%${searchTerm}%,trips.title.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PayoutWithDetails[];
    }
  });

  // Process a manual payout
  const processPayoutMutation = useMutation({
    mutationFn: async ({ tripId, payoutType }: { tripId: string; payoutType: string }) => {
      const { data, error } = await supabase.functions.invoke('process-sensei-payouts', {
        body: { trip_id: tripId, payout_type: payoutType }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      toast.success(`${data.stage} payout processed successfully: ${data.description}`);
    },
    onError: (error: any) => {
      toast.error('Failed to process payout: ' + error.message);
    }
  });

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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  // Calculate summary stats
  const totalPaid = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.net_amount, 0) || 0;
  const totalPending = payouts?.filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.net_amount, 0) || 0;
  const totalPlatformFees = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.platform_fee, 0) || 0;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payouts Overview</h2>
          <p className="text-muted-foreground">
            Monitor and manage all Sensei payouts across the three-stage payment system.
          </p>
        </div>
        <RealTimeNotifications />
      </div>

      {/* Enhanced Real-time Dashboard */}
      <EnhancedRealTimeDashboard />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                to Senseis
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Platform Revenue</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPlatformFees)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                commission earned
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Pending Payouts</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalPending)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Payouts</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {payouts?.length || 0}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                across all stages
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter Payouts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by sensei name or trip title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
                <SelectItem value="day1">Day 1</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts</CardTitle>
          <CardDescription>
            Complete list of payouts with manual processing capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts?.length === 0 ? (
            <div className="text-center py-8">
              <Euro className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-semibold mb-2">No payouts found</h4>
              <p className="text-sm text-muted-foreground">
                No payouts match your current filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts?.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    {getPayoutTypeIcon(payout.payout_type)}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{formatCurrency(payout.net_amount, payout.currency)}</span>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                        <Badge variant="outline">
                          {getPayoutTypeName(payout.payout_type)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <div>
                          <strong>{payout.sensei_profiles?.name}</strong> • {payout.trips?.title}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span>Level: {payout.sensei_profiles?.sensei_level}</span>
                          <span>Created: {formatDate(payout.created_at)}</span>
                          {payout.paid_at && (
                            <span>Paid: {formatDate(payout.paid_at)}</span>
                          )}
                        </div>
                      </div>

                      {payout.notes && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          {payout.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right text-sm">
                      <div>Gross: {formatCurrency(payout.gross_amount, payout.currency)}</div>
                      <div className="text-muted-foreground">
                        Platform: {formatCurrency(payout.platform_fee, payout.currency)}
                      </div>
                      {payout.commission_percent && (
                        <div className="text-muted-foreground">
                          Commission: {payout.commission_percent}%
                        </div>
                      )}
                    </div>

                    {payout.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => processPayoutMutation.mutate({
                          tripId: payout.trip_id,
                          payoutType: payout.payout_type
                        })}
                        disabled={processPayoutMutation.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Process
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

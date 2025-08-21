
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Euro, TrendingUp, Clock, CheckCircle, Download, CreditCard, Zap } from 'lucide-react';
import { useSenseiPayouts } from '@/hooks/use-sensei-payouts';
import { SenseiStripeConnect } from '@/components/ui/sensei-stripe-connect';

export const SenseiEarningsDashboard = () => {
  const { earningsSummary, payouts, isLoading } = useSenseiPayouts();

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
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return <Euro className="h-4 w-4 text-green-500" />;
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

  // Separate advance and final payouts
  const advancePayouts = payouts.filter(p => p.payout_type === 'advance');
  const finalPayouts = payouts.filter(p => p.payout_type === 'final' || !p.payout_type);

  return (
    <div className="space-y-6">
      {/* Stripe Connect Setup */}
      <SenseiStripeConnect />

      {/* Earnings Summary */}
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
              <span className="text-sm font-medium text-muted-foreground">Paid Out</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {earningsSummary ? formatCurrency(earningsSummary.total_paid) : '€0.00'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Advance Payouts</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {formatCurrency(advancePayouts.reduce((sum, p) => sum + p.net_amount, 0))}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {advancePayouts.length} advance payments
              </p>
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
              {earningsSummary && earningsSummary.balance_due > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available for next payout
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your recent payouts and their status</CardDescription>
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
                Your payouts will appear here once processed by our team
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
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
                        {payout.payout_type === 'advance' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Advance
                          </Badge>
                        )}
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
                        Fee: -{formatCurrency(payout.platform_fee, payout.currency)}
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
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span>Advance Payouts</span>
              </h4>
              <p className="text-muted-foreground">
                Small advance payment (typically 10%) when your trip reaches minimum participants. Helps cover preparation costs.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Euro className="h-4 w-4 text-green-500" />
                <span>Final Payouts</span>
              </h4>
              <p className="text-muted-foreground">
                Remaining commission paid 7-14 days after trip completion, minus any advance already paid.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Processing Time</h4>
              <p className="text-muted-foreground">
                Bank transfers typically take 1-3 business days to appear in your account via Stripe.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tax Information</h4>
              <p className="text-muted-foreground">
                You're responsible for reporting earnings to tax authorities. Annual statements available in January.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

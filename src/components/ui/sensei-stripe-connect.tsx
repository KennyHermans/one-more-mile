
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SenseiStripeConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get current sensei profile with Stripe status
  const { data: senseiProfile } = useQuery({
    queryKey: ["sensei-stripe-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sensei_profiles")
        .select("id, stripe_account_id, stripe_connect_status")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleConnectStripe = async () => {
    if (!senseiProfile?.id) {
      toast.error('Sensei profile not found');
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: { sensei_id: senseiProfile.id }
      });

      if (error) throw error;

      if (data.account_link_url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.account_link_url;
      }
    } catch (error: any) {
      toast.error('Failed to connect Stripe: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_onboarded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Stripe Connect Setup</CardTitle>
          </div>
          {senseiProfile?.stripe_connect_status && (
            <Badge className={getStatusColor(senseiProfile.stripe_connect_status)}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(senseiProfile.stripe_connect_status)}
                <span className="capitalize">{senseiProfile.stripe_connect_status.replace('_', ' ')}</span>
              </div>
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your Stripe account to receive automated payouts for completed trips
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {senseiProfile?.stripe_connect_status === 'complete' ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Stripe account connected successfully!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your payouts will be automatically processed to your connected Stripe account within 7-14 days after trip completion.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Ready for Payouts</h4>
                  <p className="text-sm text-green-700">
                    You can now receive advance payouts when trips reach minimum participants and final payouts after trip completion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : senseiProfile?.stripe_connect_status === 'pending' ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-600">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Stripe setup in progress</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Stripe account setup is being processed. This usually takes a few minutes to complete.
            </p>
            <Button 
              onClick={handleConnectStripe}
              disabled={isConnecting}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue Stripe Setup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
              <span className="font-medium">Stripe account not connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              To receive payouts for your trips, you need to connect a Stripe account. This allows us to securely transfer your earnings directly to your bank account.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">What you'll need:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Valid government-issued ID</li>
                <li>• Bank account information</li>
                <li>• Business details (if applicable)</li>
                <li>• Tax information</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnectStripe}
              disabled={isConnecting}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Stripe Account'}
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">How payouts work:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Advance payout:</strong> Small percentage when trip reaches minimum bookings</li>
            <li>• <strong>Final payout:</strong> Remaining commission 7-14 days after trip completion</li>
            <li>• <strong>Security:</strong> All transactions are secured and processed through Stripe</li>
            <li>• <strong>Transparency:</strong> Full payout history available in your dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

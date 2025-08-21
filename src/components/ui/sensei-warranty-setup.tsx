import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CreditCard, AlertTriangle } from 'lucide-react';
import { useSenseiWarranty } from '@/hooks/use-sensei-warranty';

const stripePromise = loadStripe('pk_test_TcJa8h5iAgvVJr5k1LfhJXOT00daLPHkmp');

const WarrantyCardForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createSetupIntent, saveWarrantyMethod, warrantySettings } = useSenseiWarranty();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create setup intent
      const setupIntentResult = await createSetupIntent.mutateAsync();
      
      if (!setupIntentResult?.client_secret) {
        throw new Error('Failed to create setup intent');
      }

      // Confirm setup intent with card
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setupIntentResult.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        // Save warranty method
        await saveWarrantyMethod.mutateAsync(setupIntent.id);
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Add Warranty Card</CardTitle>
        </div>
        <CardDescription>
          This card will only be charged if there are serious violations like no-shows, fraud, or contract breaches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: 'hsl(var(--foreground))',
                    '::placeholder': {
                      color: 'hsl(var(--muted-foreground))',
                    },
                  },
                },
              }}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>
              Maximum warranty amount: €{(warrantySettings?.max_amount?.amount || 50000) / 100}
            </span>
          </div>

          <Button
            type="submit"
            disabled={!stripe || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Setting up...' : 'Add Warranty Card'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export const SenseiWarrantySetup = () => {
  const { warrantyMethod, hasWarrantyMethod } = useSenseiWarranty();

  if (hasWarrantyMethod && warrantyMethod) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Warranty Card Active</CardTitle>
          </div>
          <CardDescription>
            Your warranty card is on file and ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <CreditCard className="h-5 w-5" />
            <div>
              <div className="font-medium capitalize">
                {warrantyMethod.card_brand} ending in {warrantyMethod.card_last4}
              </div>
              <div className="text-sm text-muted-foreground">
                Expires {warrantyMethod.card_exp_month}/{warrantyMethod.card_exp_year}
              </div>
            </div>
          </div>
          
          <Alert className="mt-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Warranty charges are percentage-based (10% of trip revenue) and only apply for serious violations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <WarrantyCardForm />
    </Elements>
  );
};
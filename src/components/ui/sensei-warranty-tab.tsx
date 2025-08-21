import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useSenseiWarranty } from '@/hooks/use-sensei-warranty';
import { SenseiWarrantySetup } from './sensei-warranty-setup';
import { formatDistance } from 'date-fns';

export const SenseiWarrantyTab = () => {
  const { warrantyMethod, warrantyCharges, isLoading, hasWarrantyMethod } = useSenseiWarranty();

  const getChargeStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getChargeStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Warranty System</h2>
        <p className="text-muted-foreground">
          Manage your warranty card and view charge history.
        </p>
      </div>

      {/* Warranty Card Setup/Display */}
      <SenseiWarrantySetup />

      {/* Warranty Charges History */}
      {hasWarrantyMethod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Warranty Charge History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warrantyCharges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No warranty charges yet.</p>
                <p className="text-sm">This is good news! Keep up the great work.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {warrantyCharges.map((charge) => (
                  <div key={charge.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getChargeStatusIcon(charge.charge_status)}
                          <span className="font-medium">
                            €{(charge.amount_charged / 100).toFixed(2)}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={getChargeStatusColor(charge.charge_status)}
                          >
                            {charge.charge_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {charge.charge_reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistance(new Date(charge.created_at), new Date(), { addSuffix: true })}
                        </p>
                      </div>
                      {charge.failure_reason && (
                        <div className="text-xs text-red-600 max-w-xs">
                          <span className="font-medium">Failed:</span> {charge.failure_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            • Your warranty card is only charged in case of violations of the Sensei Agreement.
          </p>
          <p>
            • Common reasons for charges include trip cancellations without sufficient notice, 
            damage to provided equipment, or other breaches of agreement.
          </p>
          <p>
            • You will be notified before any charge is made, and you can contest charges 
            through our support system.
          </p>
          <p>
            • You can update your warranty card at any time by adding a new one. 
            The previous card will be automatically deactivated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
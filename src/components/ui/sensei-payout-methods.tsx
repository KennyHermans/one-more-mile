
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, CreditCard, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSenseiPayouts } from '@/hooks/use-sensei-payouts';

const COUNTRIES = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'LU', name: 'Luxembourg' },
];

export const SenseiPayoutMethods = () => {
  const { payoutMethods, addPayoutMethod, updatePayoutMethod, deletePayoutMethod, isAdding } = useSenseiPayouts();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    account_holder_name: '',
    iban: '',
    country: '',
    is_default: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPayoutMethod(formData);
    setShowAddDialog(false);
    setFormData({
      display_name: '',
      account_holder_name: '',
      iban: '',
      country: '',
      is_default: false,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payout Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage your bank account details for receiving payments
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payout Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Transfer Method</DialogTitle>
              <DialogDescription>
                Add your bank account details to receive payments. Only IBAN format is supported.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Display Name (Optional)</Label>
                <Input
                  id="display_name"
                  placeholder="e.g., My Main Account"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN *</Label>
                <Input
                  id="iban"
                  placeholder="NL91ABNA0417164300"
                  required
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value.replace(/\s/g, '').toUpperCase() })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Set as default payout method</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding} className="flex-1">
                  {isAdding ? 'Adding...' : 'Add Method'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {payoutMethods.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-semibold mb-2">No payout methods yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Add a bank account to receive your earnings
              </p>
            </CardContent>
          </Card>
        ) : (
          payoutMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {method.display_name || `${method.account_holder_name}'s Account`}
                        </span>
                        {method.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.masked_iban} • {method.account_holder_name}
                      </div>
                      {method.country && (
                        <div className="text-xs text-muted-foreground">
                          {COUNTRIES.find(c => c.code === method.country)?.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(method.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(method.status)}
                        <span className="capitalize">{method.status}</span>
                      </div>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePayoutMethod(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {payoutMethods.some(method => method.status === 'unverified') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Verification Required</h4>
              <p className="text-sm text-yellow-700">
                Your payout methods need to be verified by our team before you can receive payments. 
                This usually takes 1-2 business days.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

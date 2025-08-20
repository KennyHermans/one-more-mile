
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PayoutMethod {
  id: string;
  method_type: 'bank_transfer';
  display_name?: string;
  account_holder_name: string;
  masked_iban: string;
  iban_last4: string;
  country?: string;
  currency: string;
  is_default: boolean;
  status: 'unverified' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface Payout {
  id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  period_start?: string;
  period_end?: string;
  notes?: string;
  paid_at?: string;
  created_at: string;
}

interface EarningsSummary {
  sensei_id: string;
  commission_percent: number;
  total_gross: number;
  total_earnings: number;
  total_paid: number;
  balance_due: number;
}

export const useSenseiPayouts = () => {
  const queryClient = useQueryClient();

  // Fetch payout methods
  const { data: payoutMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ['sensei-payout-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_payout_methods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PayoutMethod[];
    },
  });

  // Fetch payouts history
  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['sensei-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensei_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Payout[];
    },
  });

  // Fetch earnings summary
  const { data: earningsSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['sensei-earnings-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_sensei_earnings_summary');

      if (error) throw error;
      return data as EarningsSummary;
    },
  });

  // Add payout method mutation
  const addPayoutMethod = useMutation({
    mutationFn: async (methodData: {
      display_name?: string;
      account_holder_name: string;
      iban: string;
      country?: string;
      is_default?: boolean;
    }) => {
      // Get current user's sensei profile
      const { data: profile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Sensei profile not found');

      // Create masked IBAN and extract last 4
      const maskedIban = methodData.iban.replace(/(.{2})(.*)(.{4})/, '$1** **** **** **$3');
      const ibanLast4 = methodData.iban.slice(-4);

      const { data, error } = await supabase
        .from('sensei_payout_methods')
        .insert({
          sensei_id: profile.id,
          display_name: methodData.display_name,
          account_holder_name: methodData.account_holder_name,
          masked_iban: maskedIban,
          iban_last4: ibanLast4,
          country: methodData.country,
          is_default: methodData.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensei-payout-methods'] });
      toast.success('Payout method added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add payout method: ' + error.message);
    },
  });

  // Update payout method mutation
  const updatePayoutMethod = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayoutMethod> & { id: string }) => {
      const { data, error } = await supabase
        .from('sensei_payout_methods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensei-payout-methods'] });
      toast.success('Payout method updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update payout method: ' + error.message);
    },
  });

  // Delete payout method mutation
  const deletePayoutMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sensei_payout_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensei-payout-methods'] });
      toast.success('Payout method deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete payout method: ' + error.message);
    },
  });

  return {
    payoutMethods: payoutMethods || [],
    payouts: payouts || [],
    earningsSummary,
    isLoading: methodsLoading || payoutsLoading || summaryLoading,
    addPayoutMethod: addPayoutMethod.mutate,
    updatePayoutMethod: updatePayoutMethod.mutate,
    deletePayoutMethod: deletePayoutMethod.mutate,
    isAdding: addPayoutMethod.isPending,
    isUpdating: updatePayoutMethod.isPending,
    isDeleting: deletePayoutMethod.isPending,
  };
};

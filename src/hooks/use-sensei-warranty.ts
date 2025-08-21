import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WarrantyMethod {
  id: string;
  sensei_id: string;
  stripe_setup_intent_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WarrantyCharge {
  id: string;
  sensei_id: string;
  warranty_method_id: string;
  stripe_payment_intent_id: string;
  amount_charged: number;
  currency: string;
  charge_reason: string;
  charged_by_admin: string;
  charge_status: string;
  failure_reason: string | null;
  created_at: string;
}

interface WarrantySettings {
  max_amount: {
    amount: number;
    currency: string;
  };
  disclosure_text: {
    text: string;
  };
}

export const useSenseiWarranty = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current sensei profile
  const { data: senseiProfile } = useQuery({
    queryKey: ["current-sensei-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sensei_profiles")
        .select("id, name")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Get warranty method
  const { data: warrantyMethod, isLoading: isLoadingMethod } = useQuery({
    queryKey: ["warranty-method", senseiProfile?.id],
    queryFn: async () => {
      if (!senseiProfile?.id) return null;

      const { data, error } = await supabase
        .from("sensei_warranty_methods")
        .select("*")
        .eq("sensei_id", senseiProfile.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as WarrantyMethod | null;
    },
    enabled: !!senseiProfile?.id,
  });

  // Get warranty charges
  const { data: warrantyCharges, isLoading: isLoadingCharges } = useQuery({
    queryKey: ["warranty-charges", senseiProfile?.id],
    queryFn: async () => {
      if (!senseiProfile?.id) return [];

      const { data, error } = await supabase
        .from("sensei_warranty_charges")
        .select("*")
        .eq("sensei_id", senseiProfile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WarrantyCharge[];
    },
    enabled: !!senseiProfile?.id,
  });

  // Get warranty settings
  const { data: warrantySettings } = useQuery({
    queryKey: ["warranty-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_warranty_settings");
      if (error) throw error;
      return data as unknown as WarrantySettings;
    },
  });

  // Create setup intent
  const createSetupIntent = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("warranty-create-setup-intent");
      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      console.error("Setup intent error:", error);
      toast({
        title: "Error",
        description: "Failed to initialize card setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save warranty method
  const saveWarrantyMethod = useMutation({
    mutationFn: async (setup_intent_id: string) => {
      const { data, error } = await supabase.functions.invoke("warranty-save-method", {
        body: { setup_intent_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-method"] });
      toast({
        title: "Success",
        description: "Warranty card saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Save method error:", error);
      toast({
        title: "Error",
        description: "Failed to save warranty card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const hasWarrantyMethod = !!warrantyMethod;
  const isLoading = isLoadingMethod || isLoadingCharges;

  return {
    senseiProfile,
    warrantyMethod,
    warrantyCharges: warrantyCharges || [],
    warrantySettings,
    hasWarrantyMethod,
    isLoading,
    createSetupIntent,
    saveWarrantyMethod,
  };
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/error-handler";

export function AdminReservationSettings() {
  const [reservationDays, setReservationDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentSetting();
  }, []);

  const fetchCurrentSetting = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('setting_value')
        .eq('setting_name', 'reservation_deadline_days')
        .single();

      if (error) throw error;

      if (data?.setting_value) {
        setReservationDays(parseInt(data.setting_value.toString()));
      }
    } catch (error) {
      handleError(error, {
        component: 'AdminReservationSettings',
        action: 'fetchSettings'
      }, true, "Failed to load reservation settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('payment_settings')
        .update({ 
          setting_value: reservationDays.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_name', 'reservation_deadline_days');

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: `Reservation deadline set to ${reservationDays} days`,
      });
    } catch (error) {
      handleError(error, {
        component: 'AdminReservationSettings',
        action: 'updateSettings'
      }, true, "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservation Settings</CardTitle>
          <CardDescription>Loading current settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservation Settings</CardTitle>
        <CardDescription>
          Configure how long customers have to complete payment after making a reservation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reservation-days">
            Reservation Deadline (Days)
          </Label>
          <Input
            id="reservation-days"
            type="number"
            min="1"
            max="365"
            value={reservationDays}
            onChange={(e) => setReservationDays(parseInt(e.target.value) || 1)}
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            Customers will have {reservationDays} days to complete payment or make a deposit after reserving a spot.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Customers can reserve spots without immediate payment</li>
            <li>• They have {reservationDays} days to pay in full or make a €1,000 deposit</li>
            <li>• Automated reminders are sent via email and in-app notifications</li>
            <li>• Reservations are automatically cancelled if payment isn't completed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
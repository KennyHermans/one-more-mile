import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, RotateCcw } from "lucide-react";

interface PaymentSetting {
  id: string;
  setting_name: string;
  setting_value: any;
  description: string;
}

interface SettingsForm {
  reservation_deadline_days: number;
  payment_deadline_months: number;
  grace_period_hours: number;
  reminder_frequency_hours: number;
  reminder_intervals_days: number[];
}

const DEFAULT_SETTINGS: SettingsForm = {
  reservation_deadline_days: 7,
  payment_deadline_months: 3,
  grace_period_hours: 24,
  reminder_frequency_hours: 24,
  reminder_intervals_days: [7, 3, 1]
};

export function AdminPaymentSettings() {
  const [settings, setSettings] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderDaysInput, setReminderDaysInput] = useState("7, 3, 1");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Partial<SettingsForm> = {};
      
      data.forEach((setting: PaymentSetting) => {
        switch (setting.setting_name) {
          case 'reservation_deadline_days':
            settingsMap.reservation_deadline_days = parseInt(setting.setting_value.toString());
            break;
          case 'payment_deadline_months':
            settingsMap.payment_deadline_months = parseInt(setting.setting_value.toString());
            break;
          case 'grace_period_hours':
            settingsMap.grace_period_hours = parseInt(setting.setting_value.toString());
            break;
          case 'reminder_frequency_hours':
            settingsMap.reminder_frequency_hours = parseInt(setting.setting_value.toString());
            break;
          case 'reminder_intervals_days':
            const intervals = Array.isArray(setting.setting_value) 
              ? setting.setting_value.map(Number)
              : JSON.parse(setting.setting_value).map(Number);
            settingsMap.reminder_intervals_days = intervals;
            setReminderDaysInput(intervals.join(', '));
            break;
        }
      });

      setSettings({ ...DEFAULT_SETTINGS, ...settingsMap });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Validate reminder intervals
      const reminderIntervals = reminderDaysInput
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => b - a); // Sort descending

      if (reminderIntervals.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please enter valid reminder intervals (comma-separated numbers)",
          variant: "destructive",
        });
        return;
      }

      // Validate all settings are positive numbers
      if (settings.reservation_deadline_days <= 0 || 
          settings.payment_deadline_months <= 0 || 
          settings.grace_period_hours <= 0 || 
          settings.reminder_frequency_hours <= 0) {
        toast({
          title: "Validation Error",
          description: "All values must be positive numbers",
          variant: "destructive",
        });
        return;
      }

      // Update each setting
      const updates = [
        {
          setting_name: 'reservation_deadline_days',
          setting_value: settings.reservation_deadline_days.toString(),
          description: 'Number of days customers have to complete payment after making a reservation'
        },
        {
          setting_name: 'payment_deadline_months',
          setting_value: settings.payment_deadline_months.toString(),
          description: 'Months before trip start when payment is due'
        },
        {
          setting_name: 'grace_period_hours',
          setting_value: settings.grace_period_hours.toString(),
          description: 'Hours after deadline before auto-cancellation'
        },
        {
          setting_name: 'reminder_frequency_hours',
          setting_value: settings.reminder_frequency_hours.toString(),
          description: 'Minimum hours between reminder emails'
        },
        {
          setting_name: 'reminder_intervals_days',
          setting_value: JSON.stringify(reminderIntervals),
          description: 'Days before deadline to send reminders'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('payment_settings')
          .update({
            setting_value: update.setting_value,
            description: update.description,
            updated_at: new Date().toISOString()
          })
          .eq('setting_name', update.setting_name);

        if (error) throw error;
      }

      // Update local state
      setSettings(prev => ({
        ...prev,
        reminder_intervals_days: reminderIntervals
      }));

      toast({
        title: "Settings Updated",
        description: "Payment settings have been successfully updated",
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to update payment settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setReminderDaysInput(DEFAULT_SETTINGS.reminder_intervals_days.join(', '));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Loading payment configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Configure payment deadlines, reminders, and automation settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reservation Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Reservation Settings</h3>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="reservation-deadline">
                Reservation Deadline (Days)
              </Label>
              <Input
                id="reservation-deadline"
                type="number"
                min="1"
                max="365"
                value={settings.reservation_deadline_days}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  reservation_deadline_days: parseInt(e.target.value) || 1
                }))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                How long customers have to complete payment after making a reservation
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="payment-deadline">
                Payment Deadline (Months)
              </Label>
              <Input
                id="payment-deadline"
                type="number"
                min="1"
                max="12"
                value={settings.payment_deadline_months}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  payment_deadline_months: parseInt(e.target.value) || 1
                }))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Months before trip start when payment is due
              </p>
            </div>

            <div>
              <Label htmlFor="grace-period">
                Grace Period (Hours)
              </Label>
              <Input
                id="grace-period"
                type="number"
                min="1"
                max="168"
                value={settings.grace_period_hours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  grace_period_hours: parseInt(e.target.value) || 1
                }))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Hours after deadline before auto-cancellation
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Reminder Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Reminder Settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="reminder-frequency">
                Reminder Frequency (Hours)
              </Label>
              <Input
                id="reminder-frequency"
                type="number"
                min="1"
                max="168"
                value={settings.reminder_frequency_hours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  reminder_frequency_hours: parseInt(e.target.value) || 1
                }))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum hours between reminder emails
              </p>
            </div>

            <div>
              <Label htmlFor="reminder-intervals">
                Reminder Intervals (Days)
              </Label>
              <Input
                id="reminder-intervals"
                type="text"
                value={reminderDaysInput}
                onChange={(e) => setReminderDaysInput(e.target.value)}
                placeholder="7, 3, 1"
                className="w-48"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Days before deadline to send reminders (comma-separated)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="min-w-24"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Current Values Preview */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-3">Current Configuration Summary</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Reservation deadline:</span>
              <span className="font-mono">{settings.reservation_deadline_days} days</span>
            </div>
            <div className="flex justify-between">
              <span>Payment deadline:</span>
              <span className="font-mono">{settings.payment_deadline_months} months before trip</span>
            </div>
            <div className="flex justify-between">
              <span>Grace period:</span>
              <span className="font-mono">{settings.grace_period_hours} hours</span>
            </div>
            <div className="flex justify-between">
              <span>Reminder frequency:</span>
              <span className="font-mono">{settings.reminder_frequency_hours} hours</span>
            </div>
            <div className="flex justify-between">
              <span>Reminder intervals:</span>
              <span className="font-mono">{settings.reminder_intervals_days.join(', ')} days</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
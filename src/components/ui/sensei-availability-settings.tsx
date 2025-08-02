import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SenseiProfile {
  id: string;
  is_offline: boolean;
  unavailable_months: string[];
  certifications: string[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SenseiAvailabilitySettings() {
  const [profile, setProfile] = useState<SenseiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [unavailableMonths, setUnavailableMonths] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sensei_profiles')
        .select('id, is_offline, unavailable_months, certifications')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setIsOffline(data.is_offline || false);
        setUnavailableMonths(data.unavailable_months || []);
        setCertifications(data.certifications || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sensei_profiles')
        .update({
          is_offline: isOffline,
          unavailable_months: unavailableMonths,
          certifications: certifications
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success('Availability settings updated successfully');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMonth = (month: string) => {
    setUnavailableMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const addCertification = (certification: string) => {
    if (certification.trim() && !certifications.includes(certification.trim())) {
      setCertifications(prev => [...prev, certification.trim()]);
    }
  };

  const removeCertification = (certification: string) => {
    setCertifications(prev => prev.filter(c => c !== certification));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading availability settings...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            You need to have a sensei profile to manage availability settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Availability Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Offline Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="offline-mode">Take a Break</Label>
              <div className="text-sm text-muted-foreground">
                Set your profile offline to temporarily stop receiving trip assignments
              </div>
            </div>
            <Switch
              id="offline-mode"
              checked={isOffline}
              onCheckedChange={setIsOffline}
            />
          </div>

          {isOffline && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Profile is offline</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                You won't appear in trip suggestions while offline mode is enabled.
              </p>
            </div>
          )}

          {/* Unavailable Months */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Unavailable Months
            </Label>
            <div className="text-sm text-muted-foreground mb-3">
              Select months when you're not available for trips
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {MONTHS.map((month) => (
                <div key={month} className="flex items-center space-x-2">
                  <Checkbox
                    id={month}
                    checked={unavailableMonths.includes(month)}
                    onCheckedChange={() => toggleMonth(month)}
                  />
                  <Label htmlFor={month} className="text-sm">
                    {month}
                  </Label>
                </div>
              ))}
            </div>
            {unavailableMonths.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-sm text-muted-foreground">Unavailable: </span>
                {unavailableMonths.map((month) => (
                  <Badge key={month} variant="secondary">
                    {month}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="space-y-3">
            <Label>Certifications</Label>
            <div className="text-sm text-muted-foreground mb-3">
              Add certifications to improve trip matching accuracy
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {certifications.map((cert) => (
                <Badge
                  key={cert}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => removeCertification(cert)}
                >
                  {cert} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add certification (e.g., Diving Instructor)"
                className="flex-1 px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addCertification(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  addCertification(input.value);
                  input.value = '';
                }}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
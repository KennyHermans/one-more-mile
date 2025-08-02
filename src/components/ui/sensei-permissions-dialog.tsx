import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Label } from "./label";
import { Switch } from "./switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useToast } from "@/hooks/use-toast";
import { Save, X } from "lucide-react";

interface SenseiPermissionsDialogProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface SenseiProfile {
  id: string;
  name: string;
  user_id: string;
}

interface TripPermissions {
  description?: boolean;
  program?: boolean;
  included_amenities?: boolean;
  excluded_items?: boolean;
  requirements?: boolean;
  dates?: boolean;
  price?: boolean;
  group_size?: boolean;
  title?: boolean;
  destination?: boolean;
  theme?: boolean;
}

const permissionPresets = {
  "read-only": {
    description: false,
    program: false,
    included_amenities: false,
    excluded_items: false,
    requirements: false,
    dates: false,
    price: false,
    group_size: false,
    title: false,
    destination: false,
    theme: false,
  },
  "basic-editor": {
    description: true,
    program: true,
    included_amenities: true,
    excluded_items: true,
    requirements: true,
    dates: false,
    price: false,
    group_size: false,
    title: false,
    destination: false,
    theme: false,
  },
  "full-editor": {
    description: true,
    program: true,
    included_amenities: true,
    excluded_items: true,
    requirements: true,
    dates: true,
    price: false,
    group_size: true,
    title: false,
    destination: false,
    theme: false,
  },
  "admin-level": {
    description: true,
    program: true,
    included_amenities: true,
    excluded_items: true,
    requirements: true,
    dates: true,
    price: true,
    group_size: true,
    title: true,
    destination: true,
    theme: true,
  },
};

export function SenseiPermissionsDialog({ tripId, isOpen, onClose, onSave }: SenseiPermissionsDialogProps) {
  const [senseis, setSenseis] = useState<SenseiProfile[]>([]);
  const [selectedSensei, setSelectedSensei] = useState<string>("");
  const [permissions, setPermissions] = useState<TripPermissions>({});
  const [existingPermissions, setExistingPermissions] = useState<{[key: string]: TripPermissions}>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSenseis();
      fetchExistingPermissions();
    }
  }, [isOpen, tripId]);

  const fetchSenseis = async () => {
    try {
      const { data } = await supabase
        .from('sensei_profiles')
        .select('id, name, user_id')
        .eq('is_active', true);
      
      setSenseis(data || []);
    } catch (error) {
      console.error('Error fetching senseis:', error);
    }
  };

  const fetchExistingPermissions = async () => {
    try {
      const { data } = await supabase
        .from('trip_permissions')
        .select('sensei_id, permissions')
        .eq('trip_id', tripId);
      
      const permissionsMap: {[key: string]: TripPermissions} = {};
      data?.forEach(p => {
        permissionsMap[p.sensei_id] = p.permissions as TripPermissions;
      });
      
      setExistingPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handlePresetChange = (preset: string) => {
    if (preset in permissionPresets) {
      setPermissions(permissionPresets[preset as keyof typeof permissionPresets]);
    }
  };

  const handlePermissionChange = (field: keyof TripPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedSensei) {
      toast({
        title: "Error",
        description: "Please select a sensei.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('trip_permissions')
        .upsert({
          trip_id: tripId,
          sensei_id: selectedSensei,
          permissions: permissions as any,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sensei permissions updated successfully!",
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSenseiChange = (senseiId: string) => {
    setSelectedSensei(senseiId);
    // Load existing permissions for this sensei if they exist
    if (existingPermissions[senseiId]) {
      setPermissions(existingPermissions[senseiId]);
    } else {
      setPermissions({});
    }
  };

  const permissionFields = [
    { key: 'title', label: 'Trip Title', category: 'Core Info' },
    { key: 'destination', label: 'Destination', category: 'Core Info' },
    { key: 'description', label: 'Description', category: 'Content' },
    { key: 'program', label: 'Daily Program', category: 'Content' },
    { key: 'included_amenities', label: 'Included Amenities', category: 'Content' },
    { key: 'excluded_items', label: 'Excluded Items', category: 'Content' },
    { key: 'requirements', label: 'Requirements', category: 'Content' },
    { key: 'dates', label: 'Trip Dates', category: 'Logistics' },
    { key: 'price', label: 'Pricing', category: 'Logistics' },
    { key: 'group_size', label: 'Group Size', category: 'Logistics' },
    { key: 'theme', label: 'Trip Theme', category: 'Settings' },
  ];

  const groupedFields = permissionFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as {[key: string]: typeof permissionFields});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Sensei Permissions</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Sensei Selection */}
          <div>
            <Label htmlFor="sensei-select">Select Sensei</Label>
            <Select value={selectedSensei} onValueChange={handleSenseiChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a sensei..." />
              </SelectTrigger>
              <SelectContent>
                {senseis.map(sensei => (
                  <SelectItem key={sensei.id} value={sensei.id}>
                    {sensei.name} {existingPermissions[sensei.id] && "(Has permissions)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSensei && (
            <>
              {/* Preset Selection */}
              <div>
                <Label htmlFor="preset-select">Permission Preset</Label>
                <Select onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset or set custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read-only">Read Only</SelectItem>
                    <SelectItem value="basic-editor">Basic Editor</SelectItem>
                    <SelectItem value="full-editor">Full Editor</SelectItem>
                    <SelectItem value="admin-level">Admin Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permission Toggles */}
              <div className="space-y-6">
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {fields.map(field => (
                        <div key={field.key} className="flex items-center justify-between">
                          <Label htmlFor={field.key} className="text-sm">
                            {field.label}
                          </Label>
                          <Switch
                            id={field.key}
                            checked={permissions[field.key as keyof TripPermissions] || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(field.key as keyof TripPermissions, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !selectedSensei}>
              <Save className="w-4 h-4 mr-2" />
              Save Permissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
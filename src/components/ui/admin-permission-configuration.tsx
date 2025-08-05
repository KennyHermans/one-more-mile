import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SenseiLevelBadge } from "@/components/ui/sensei-level-badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/error-handler";
import { 
  Shield, 
  Settings, 
  Eye, 
  Edit2, 
  Plus, 
  Wand2, 
  DollarSign,
  Save,
  RefreshCw
} from "lucide-react";

interface LevelPermissions {
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  can_view_trips: boolean;
  can_apply_backup: boolean;
  can_edit_profile: boolean;
  can_edit_trips: boolean;
  can_create_trips: boolean;
  can_use_ai_builder: boolean;
  can_publish_trips: boolean;
  can_modify_pricing: boolean;
}

interface FieldPermission {
  sensei_level: 'apprentice' | 'journey_guide' | 'master_sensei';
  field_name: string;
  can_edit: boolean;
}

const EDITABLE_FIELDS = [
  'title',
  'description', 
  'destination',
  'theme',
  'dates',
  'price',
  'group_size',
  'included_amenities',
  'excluded_items',
  'requirements',
  'program'
];

const FIELD_LABELS: Record<string, string> = {
  title: 'Trip Title',
  description: 'Description',
  destination: 'Destination',
  theme: 'Theme',
  dates: 'Dates',
  price: 'Price',
  group_size: 'Group Size',
  included_amenities: 'Included Items',
  excluded_items: 'Excluded Items',
  requirements: 'Requirements',
  program: 'Day-by-Day Program'
};

export const AdminPermissionConfiguration = () => {
  const [levelPermissions, setLevelPermissions] = useState<LevelPermissions[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch level permissions
      const { data: levelData, error: levelError } = await supabase
        .from('sensei_level_permissions')
        .select('*')
        .order('sensei_level');

      if (levelError) throw levelError;

      // Fetch field permissions
      const { data: fieldData, error: fieldError } = await supabase
        .from('sensei_level_field_permissions')
        .select('*')
        .order('sensei_level, field_name');

      if (fieldError) throw fieldError;

      setLevelPermissions(levelData || []);
      setFieldPermissions(fieldData || []);
      setHasChanges(false);
    } catch (error) {
      handleError(error, {
        component: 'AdminPermissionConfiguration',
        action: 'fetchPermissions'
      }, true, "Failed to load permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const updateLevelPermission = (
    level: 'apprentice' | 'journey_guide' | 'master_sensei',
    permission: keyof Omit<LevelPermissions, 'sensei_level'>,
    value: boolean
  ) => {
    setLevelPermissions(prev => 
      prev.map(p => 
        p.sensei_level === level 
          ? { ...p, [permission]: value }
          : p
      )
    );
    setHasChanges(true);
  };

  const updateFieldPermission = (
    level: 'apprentice' | 'journey_guide' | 'master_sensei',
    fieldName: string,
    canEdit: boolean
  ) => {
    setFieldPermissions(prev => {
      const existing = prev.find(p => p.sensei_level === level && p.field_name === fieldName);
      if (existing) {
        return prev.map(p => 
          p.sensei_level === level && p.field_name === fieldName
            ? { ...p, can_edit: canEdit }
            : p
        );
      } else {
        return [...prev, { sensei_level: level, field_name: fieldName, can_edit: canEdit }];
      }
    });
    setHasChanges(true);
  };

  const savePermissions = async () => {
    try {
      setSaving(true);

      // Save each level's permissions
      for (const levelPerm of levelPermissions) {
        const { error: levelError } = await supabase
          .rpc('update_sensei_level_permissions', {
            p_sensei_level: levelPerm.sensei_level,
            p_permissions: {
              can_view_trips: levelPerm.can_view_trips,
              can_apply_backup: levelPerm.can_apply_backup,
              can_edit_profile: levelPerm.can_edit_profile,
              can_edit_trips: levelPerm.can_edit_trips,
              can_create_trips: levelPerm.can_create_trips,
              can_use_ai_builder: levelPerm.can_use_ai_builder,
              can_publish_trips: levelPerm.can_publish_trips,
              can_modify_pricing: levelPerm.can_modify_pricing
            },
            p_field_permissions: fieldPermissions
              .filter(fp => fp.sensei_level === levelPerm.sensei_level)
              .reduce((acc, fp) => ({ ...acc, [fp.field_name]: fp.can_edit }), {})
          });

        if (levelError) throw levelError;
      }

      toast({
        title: "Success",
        description: "Permission configuration saved successfully",
      });

      setHasChanges(false);
    } catch (error) {
      handleError(error, {
        component: 'AdminPermissionConfiguration',
        action: 'savePermissions'
      }, true, "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const getFieldPermission = (level: 'apprentice' | 'journey_guide' | 'master_sensei', fieldName: string): boolean => {
    const permission = fieldPermissions.find(p => p.sensei_level === level && p.field_name === fieldName);
    return permission?.can_edit || false;
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading permissions...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permission Configuration
          </h2>
          <p className="text-muted-foreground">Configure what each sensei level can do</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPermissions} disabled={isSaving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {hasChanges && (
            <Button onClick={savePermissions} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Permissions</TabsTrigger>
          <TabsTrigger value="fields">Field-Level Editing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Permissions by Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="apprentice" />
                      </TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="journey_guide" />
                      </TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="master_sensei" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { key: 'can_view_trips', label: 'View Trips', icon: Eye },
                      { key: 'can_apply_backup', label: 'Apply for Backup', icon: Shield },
                      { key: 'can_edit_profile', label: 'Edit Profile', icon: Edit2 },
                      { key: 'can_edit_trips', label: 'Edit Trips', icon: Edit2 },
                      { key: 'can_create_trips', label: 'Create Trips', icon: Plus },
                      { key: 'can_use_ai_builder', label: 'Use AI Builder', icon: Wand2 },
                      { key: 'can_publish_trips', label: 'Publish Trips', icon: Settings },
                      { key: 'can_modify_pricing', label: 'Modify Pricing', icon: DollarSign }
                    ].map(({ key, label, icon: Icon }) => (
                      <TableRow key={key}>
                        <TableCell className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                        </TableCell>
                        {(['apprentice', 'journey_guide', 'master_sensei'] as const).map(level => {
                          const levelPerm = levelPermissions.find(p => p.sensei_level === level);
                          const isChecked = levelPerm?.[key as keyof LevelPermissions] as boolean || false;
                          
                          return (
                            <TableCell key={level} className="text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => 
                                  updateLevelPermission(level, key as keyof Omit<LevelPermissions, 'sensei_level'>, checked as boolean)
                                }
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Field Editing Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="apprentice" />
                      </TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="journey_guide" />
                      </TableHead>
                      <TableHead className="text-center">
                        <SenseiLevelBadge level="master_sensei" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EDITABLE_FIELDS.map(fieldName => (
                      <TableRow key={fieldName}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                            {FIELD_LABELS[fieldName]}
                          </div>
                        </TableCell>
                        {(['apprentice', 'journey_guide', 'master_sensei'] as const).map(level => (
                          <TableCell key={level} className="text-center">
                            <Checkbox
                              checked={getFieldPermission(level, fieldName)}
                              onCheckedChange={(checked) => 
                                updateFieldPermission(level, fieldName, checked as boolean)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800 font-medium">You have unsaved changes</span>
            </div>
            <Button onClick={savePermissions} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
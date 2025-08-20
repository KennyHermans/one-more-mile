import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, Users, FileText } from "lucide-react";

interface LevelPermissions {
  id: string;
  sensei_level: string;
  can_view_trips: boolean;
  can_apply_backup: boolean;
  can_edit_profile: boolean;
  can_edit_trips: boolean;
  can_create_trips: boolean;
  can_use_ai_builder: boolean;
  can_publish_trips: boolean;
  can_modify_pricing: boolean;
}

interface FieldPermissions {
  id: string;
  sensei_level: string;
  field_name: string;
  can_edit: boolean;
}

const SENSEI_LEVELS = [
  { value: 'apprentice', label: 'Apprentice', color: 'bg-blue-500' },
  { value: 'journey_guide', label: 'Journey Guide', color: 'bg-green-500' },
  { value: 'master_sensei', label: 'Master Sensei', color: 'bg-purple-500' }
];

const TRIP_FIELDS = [
  { value: 'title', label: 'Trip Title' },
  { value: 'description', label: 'Description' },
  { value: 'destination', label: 'Destination' },
  { value: 'theme', label: 'Theme' },
  { value: 'dates', label: 'Dates' },
  { value: 'price', label: 'Price' },
  { value: 'max_participants', label: 'Max participants' },
  { value: 'current_participants', label: 'Current participants' },
  { value: 'group_size', label: 'Group size label' },
  { value: 'included_amenities', label: 'Included Amenities' },
  { value: 'excluded_items', label: 'Excluded Items' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'program', label: 'Program' }
];

export function AdminLevelPermissions() {
  const [levelPermissions, setLevelPermissions] = useState<LevelPermissions[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      
      const [levelResult, fieldResult] = await Promise.all([
        supabase.from('sensei_level_permissions').select('*').order('sensei_level'),
        supabase.from('sensei_level_field_permissions').select('*').order('sensei_level, field_name')
      ]);

      if (levelResult.error) throw levelResult.error;
      if (fieldResult.error) throw fieldResult.error;

      setLevelPermissions(levelResult.data || []);
      setFieldPermissions(fieldResult.data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLevelPermission = async (senseiLevel: string, field: string, value: boolean) => {
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('sensei_level_permissions')
        .update({ [field]: value })
        .eq('sensei_level', senseiLevel);

      if (error) throw error;

      setLevelPermissions(prev => 
        prev.map(perm => 
          perm.sensei_level === senseiLevel 
            ? { ...perm, [field]: value }
            : perm
        )
      );

      toast({
        title: "Success",
        description: "Permission updated successfully"
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateFieldPermission = async (senseiLevel: string, fieldName: string, canEdit: boolean) => {
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('sensei_level_field_permissions')
        .update({ can_edit: canEdit })
        .eq('sensei_level', senseiLevel)
        .eq('field_name', fieldName);

      if (error) throw error;

      setFieldPermissions(prev => 
        prev.map(perm => 
          perm.sensei_level === senseiLevel && perm.field_name === fieldName
            ? { ...perm, can_edit: canEdit }
            : perm
        )
      );

      toast({
        title: "Success",
        description: "Field permission updated successfully"
      });
    } catch (error) {
      console.error('Error updating field permission:', error);
      toast({
        title: "Error",
        description: "Failed to update field permission",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getLevelPermissions = (level: string) => {
    return levelPermissions.find(p => p.sensei_level === level);
  };

  const getFieldPermission = (level: string, field: string) => {
    const perm = fieldPermissions.find(p => p.sensei_level === level && p.field_name === field);
    return perm?.can_edit || false;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading permissions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Sensei Level Permissions
          </h2>
          <p className="text-muted-foreground">
            Configure what each Sensei level can do and which trip fields they can edit
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General Permissions
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Trip Field Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Capabilities by Level</CardTitle>
              <CardDescription>
                Configure what actions each Sensei level can perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sensei Level</TableHead>
                      <TableHead>View Trips</TableHead>
                      <TableHead>Apply Backup</TableHead>
                      <TableHead>Edit Profile</TableHead>
                      <TableHead>Edit Trips</TableHead>
                      <TableHead>Create Trips</TableHead>
                      <TableHead>Use AI Builder</TableHead>
                      <TableHead>Publish Trips</TableHead>
                      <TableHead>Modify Pricing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SENSEI_LEVELS.map((level) => {
                      const permissions = getLevelPermissions(level.value);
                      if (!permissions) return null;

                      return (
                        <TableRow key={level.value}>
                          <TableCell>
                            <Badge variant="outline" className={`${level.color} text-white`}>
                              {level.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_view_trips}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_view_trips', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_apply_backup}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_apply_backup', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_edit_profile}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_edit_profile', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_edit_trips}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_edit_trips', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_create_trips}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_create_trips', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_use_ai_builder}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_use_ai_builder', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_publish_trips}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_publish_trips', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={permissions.can_modify_pricing}
                              onCheckedChange={(checked) => 
                                updateLevelPermission(level.value, 'can_modify_pricing', checked)
                              }
                              disabled={isSaving}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Field Edit Permissions</CardTitle>
              <CardDescription>
                Configure which trip fields each Sensei level can edit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip Field</TableHead>
                      {SENSEI_LEVELS.map((level) => (
                        <TableHead key={level.value}>
                          <Badge variant="outline" className={`${level.color} text-white`}>
                            {level.label}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TRIP_FIELDS.map((field) => (
                      <TableRow key={field.value}>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        {SENSEI_LEVELS.map((level) => (
                          <TableCell key={`${field.value}-${level.value}`}>
                            <Switch
                              checked={getFieldPermission(level.value, field.value)}
                              onCheckedChange={(checked) => 
                                updateFieldPermission(level.value, field.value, checked)
                              }
                              disabled={isSaving}
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
    </div>
  );
}
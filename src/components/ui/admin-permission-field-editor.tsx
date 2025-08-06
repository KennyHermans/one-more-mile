import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLevelRequirements } from "@/hooks/use-level-requirements";
import { useState } from "react";
import { Shield, Edit3, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminPermissionFieldEditor = () => {
  const { fieldPermissions, isLoading, updateFieldPermission } = useLevelRequirements();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handlePermissionChange = async (
    permission: any, 
    field: 'can_view' | 'can_edit', 
    value: boolean
  ) => {
    setUpdatingId(permission.id);
    
    await updateFieldPermission({
      id: permission.id,
      [field]: value
    });
    
    setUpdatingId(null);
  };

  const groupedPermissions = fieldPermissions.reduce((acc, perm) => {
    const key = `${perm.sensei_level}-${perm.field_category}`;
    if (!acc[key]) {
      acc[key] = {
        level: perm.sensei_level,
        category: perm.field_category,
        permissions: []
      };
    }
    acc[key].permissions.push(perm);
    return acc;
  }, {} as Record<string, any>);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'apprentice': return 'hsl(var(--muted-foreground))';
      case 'journey_guide': return 'hsl(var(--primary))';
      case 'master_sensei': return 'hsl(var(--accent))';
      default: return 'hsl(var(--muted))';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Field-Level Permissions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure granular field access permissions for each sensei level.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(groupedPermissions).map((group) => (
          <div key={`${group.level}-${group.category}`} className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                style={{ borderColor: getLevelColor(group.level), color: getLevelColor(group.level) }}
              >
                {group.level.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm font-medium capitalize">
                {group.category} Fields
              </span>
            </div>

            <div className="grid gap-3">
              {group.permissions.map((permission: any) => (
                <div 
                  key={permission.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    updatingId === permission.id ? 'bg-muted/50' : 'bg-card'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize">
                      {permission.field_name.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {permission.field_category} field
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* View Permission */}
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground min-w-[3rem]">View</span>
                      <Switch
                        checked={permission.can_view}
                        onCheckedChange={(value) => 
                          handlePermissionChange(permission, 'can_view', value)
                        }
                        disabled={updatingId === permission.id}
                      />
                    </div>

                    {/* Edit Permission */}
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground min-w-[3rem]">Edit</span>
                      <Switch
                        checked={permission.can_edit}
                        onCheckedChange={(value) => 
                          handlePermissionChange(permission, 'can_edit', value)
                        }
                        disabled={updatingId === permission.id || !permission.can_view}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />
          </div>
        ))}

        <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
          <p>• <strong>View permissions</strong> must be enabled before edit permissions can be granted</p>
          <p>• <strong>Field permissions</strong> are checked in addition to level-based permissions</p>
          <p>• <strong>Changes apply immediately</strong> to all senseis of the respective levels</p>
        </div>
      </CardContent>
    </Card>
  );
};
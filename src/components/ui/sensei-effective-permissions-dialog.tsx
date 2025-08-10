import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Badge } from "./badge";
import { Separator } from "./separator";
import { ScrollArea } from "./scroll-area";
import { useSenseiPermissions } from "@/hooks/use-sensei-permissions";
import { Info, Shield, Eye, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SenseiEffectivePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  senseiId?: string;
  senseiName?: string;
  tripTitle?: string;
}

export function SenseiEffectivePermissionsDialog({
  isOpen,
  onClose,
  tripId,
  senseiId,
  senseiName,
  tripTitle,
}: SenseiEffectivePermissionsDialogProps) {
  const navigate = useNavigate();
  const { permissions, isLoading, hasElevatedPermissions, currentLevel } = useSenseiPermissions(senseiId, tripId);

  const handleGoToEditor = () => {
    onClose();
    navigate("/admin/dashboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View effective permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(tripTitle || senseiName) && (
            <div className="flex items-start justify-between">
              <div className="text-sm">
                {tripTitle && (
                  <div>
                    <span className="text-muted-foreground">Trip:</span>{" "}
                    <span className="font-medium">{tripTitle}</span>
                  </div>
                )}
                {senseiName && (
                  <div>
                    <span className="text-muted-foreground">Sensei:</span>{" "}
                    <span className="font-medium">{senseiName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={hasElevatedPermissions ? "default" : "outline"}>
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  {hasElevatedPermissions ? "Elevated for this trip" : "Base level"}
                </Badge>
                {currentLevel && (
                  <Badge variant="secondary">Level: {currentLevel}</Badge>
                )}
              </div>
            </div>
          )}

          <Separator />

          <ScrollArea className="max-h-72 pr-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading permissions…</div>
            ) : !permissions ? (
              <div className="text-sm text-muted-foreground">No permissions found.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Capabilities</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <PermissionPill label="View trips" value={permissions.can_view_trips} />
                    <PermissionPill label="Create trips" value={permissions.can_create_trips} />
                    <PermissionPill label="Edit trips" value={permissions.can_edit_trips} />
                    <PermissionPill label="Publish trips" value={permissions.can_publish_trips} />
                    <PermissionPill label="Modify pricing" value={permissions.can_modify_pricing} />
                    <PermissionPill label="Use AI builder" value={permissions.can_use_ai_builder} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Editable trip fields</h4>
                  {Array.isArray(permissions.trip_edit_fields) && permissions.trip_edit_fields.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {permissions.trip_edit_fields.map((field: string) => (
                        <Badge key={field} variant="outline" className="capitalize">{field.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      No editable fields at this level
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              Edit level permissions and field access from Admin Dashboard → Level Permissions.
            </div>
            <Button variant="secondary" onClick={handleGoToEditor}>
              Open Level Permissions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionPill({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={value ? "default" : "outline"}>{label}</Badge>
    </div>
  );
}

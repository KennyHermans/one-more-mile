import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { Button } from "./button";
import { Separator } from "./separator";
import { Badge } from "./badge";
import { Info, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ReadOnlyLevelPermissions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permissions are managed centrally
        </CardTitle>
        <CardDescription>
          Edit Sensei capabilities and editable trip fields from Admin Dashboard → Level Permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            This section is read-only. We consolidated all permission editing in one place to keep a single source of truth.
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Go to Admin Dashboard and open <Badge variant="outline">Level Permissions</Badge>.
          </div>
          <Button variant="secondary" onClick={() => navigate("/admin/dashboard")}>Open Level Permissions</Button>
        </div>
      </CardContent>
    </Card>
  );
}

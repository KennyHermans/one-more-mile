import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";
import { Users, Shield, Map, MessageCircle, Settings } from "lucide-react";
import { PlatformRole } from "@/hooks/use-admin-permissions";

interface AdminRole {
  id: string;
  user_id: string;
  role: PlatformRole;
  role_description: string;
  permissions: any;
  is_active: boolean;
  granted_at: string;
  granted_by: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
}

const roleConfig = {
  admin: {
    name: "Admin",
    description: "Full control over all platform features",
    icon: Shield,
    color: "bg-red-500",
  },
  journey_curator: {
    name: "Journey Curator",
    description: "Can create, edit, and publish all trips",
    icon: Map,
    color: "bg-blue-500",
  },
  sensei_scout: {
    name: "Sensei Scout",
    description: "Can manage Sensei applications and assignments",
    icon: Users,
    color: "bg-green-500",
  },
  traveler_support: {
    name: "Traveler Support",
    description: "Can view customer profiles and provide support",
    icon: MessageCircle,
    color: "bg-purple-500",
  },
};

export function AdminRoleManagement() {
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("traveler_support");
  const [newUserEmail, setNewUserEmail] = useState("");
  const { toast } = useToast();

  const fetchAdminRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setAdminRoles(data || []);
    } catch (error) {
      handleError(error, {
        component: 'AdminRoleManagement',
        action: 'fetchRoles'
      }, true, "Failed to fetch admin roles");
    }
  };

  const searchUser = async (email: string) => {
    if (email.length < 3) return;
    
    try {
      const { data, error } = await supabase.rpc('search_users_by_email', {
        email_pattern: email
      });

      if (error) throw error;
      
      // You could set search results to state if you want to show suggestions
      console.log('Found users:', data);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  const assignRole = async () => {
    if (!newUserEmail.trim() || !selectedRole) {
      toast({
        title: "Error",
        description: "Please enter a user email and select a role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('assign_admin_role', {
        p_user_email: newUserEmail.trim(),
        p_role: selectedRole
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${roleConfig[selectedRole].name} assigned successfully`,
      });
      setNewUserEmail('');
      setSelectedRole('traveler_support');
      fetchAdminRoles(); // Refresh the list
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to assign role',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeRole = async (roleId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('revoke_admin_role', {
        p_role_id: roleId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role revoked successfully",
      });
      fetchAdminRoles(); // Refresh the list
    } catch (error: any) {
      console.error('Error revoking role:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to revoke role',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAdminRoles();
      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading roles...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Role Management
        </CardTitle>
        <CardDescription>
          Manage platform roles and permissions for administrators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assign New Role */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Assign New Role</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">User Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => {
                    setNewUserEmail(e.target.value);
                    if (e.target.value.length >= 3) {
                      searchUser(e.target.value);
                    }
                  }}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <Select value={selectedRole} onValueChange={(value: PlatformRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={assignRole} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Assigning..." : "Assign Role"}
              </Button>
            </div>
          </div>
        </div>

        {/* Current Roles */}
        <div className="space-y-4">
          <h3 className="font-semibold">Current Platform Roles</h3>
          {adminRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              No roles assigned yet
            </div>
          ) : (
            <div className="grid gap-4">
              {adminRoles.map((role) => {
                const config = roleConfig[role.role];
                const Icon = config.icon;
                
                return (
                  <div key={role.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-sm text-muted-foreground">
                            User ID: {role.user_id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Granted: {new Date(role.granted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{config.name}</Badge>
                        {role.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeRole(role.id)}
                            disabled={isLoading}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="space-y-4">
          <h3 className="font-semibold">Role Descriptions</h3>
          <div className="grid gap-3">
            {Object.entries(roleConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
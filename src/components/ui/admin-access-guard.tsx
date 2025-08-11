import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { useAdminPermissions } from '@/hooks/use-admin-permissions';
import { useProfileManagement } from '@/hooks/use-profile-management';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from './enhanced-loading-states';

interface AdminAccessGuardProps {
  children: React.ReactNode;
}

export function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { user, session } = useProfileManagement();
  const { isAdmin, isLoading, error } = useAdminCheck();
  const { permissions: adminPerms, isLoading: permsLoading } = useAdminPermissions();
  const isPlatformStaff = isAdmin || adminPerms.userRole === 'sensei_scout' || adminPerms.userRole === 'journey_curator' || adminPerms.userRole === 'partner' || adminPerms.canManageTrips;
  const navigate = useNavigate();

  // Show loading while auth is initializing or admin check is loading
  if (!session || isLoading || permsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to auth if no user after session is loaded
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Show error if admin check failed
  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="font-serif text-2xl text-destructive">
                Access Check Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Unable to verify your access permissions. Please try again or contact support if the issue persists.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show access denied if user is not admin
  if (!isPlatformStaff) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="font-serif text-2xl">
                Admin Access Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  You don't have permission to access the admin dashboard. This area is restricted to administrators only.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
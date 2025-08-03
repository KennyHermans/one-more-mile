import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileManagement } from '@/hooks/use-profile-management';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { User, Mountain } from 'lucide-react';
import { LoadingSpinner } from './enhanced-loading-states';

interface DashboardAccessGuardProps {
  requiredRole: 'customer' | 'sensei';
  children: React.ReactNode;
}

export function DashboardAccessGuard({ requiredRole, children }: DashboardAccessGuardProps) {
  const { user, profileStatus, session } = useProfileManagement();
  const navigate = useNavigate();

  // Show loading while auth is initializing or profiles are loading
  if (!session || profileStatus.isLoading) {
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

  // Check if user has required profile
  const hasRequiredProfile = requiredRole === 'customer' 
    ? profileStatus.hasCustomerProfile 
    : profileStatus.hasSenseiProfile;

  if (!hasRequiredProfile) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                {requiredRole === 'customer' ? (
                  <User className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Mountain className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <CardTitle className="font-serif text-2xl">
                {requiredRole === 'customer' ? 'Customer Profile Required' : 'Sensei Profile Required'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  {requiredRole === 'customer' 
                    ? 'You need a customer profile to access the customer dashboard. Create one to start booking adventures!'
                    : 'You need a sensei profile to access the sensei dashboard. Apply to become a sensei to start leading trips!'
                  }
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 justify-center">
                {requiredRole === 'customer' ? (
                  <Button 
                    onClick={() => navigate('/customer/profile')}
                    className="flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Create Customer Profile
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/become-sensei')}
                    className="flex items-center gap-2"
                  >
                    <Mountain className="w-4 h-4" />
                    Become a Sensei
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </Button>
              </div>

              {/* Show alternative if user has the other profile */}
              {requiredRole === 'customer' && profileStatus.hasSenseiProfile && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Or access your existing sensei dashboard:
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/sensei/dashboard')}
                    className="flex items-center gap-2"
                  >
                    <Mountain className="w-4 h-4" />
                    Go to Sensei Dashboard
                  </Button>
                </div>
              )}

              {requiredRole === 'sensei' && profileStatus.hasCustomerProfile && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Or access your existing customer dashboard:
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/customer/dashboard')}
                    className="flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Go to Customer Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
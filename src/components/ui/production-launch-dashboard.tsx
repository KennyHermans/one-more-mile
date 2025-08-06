import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Rocket, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Zap,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useProductionLaunch } from '@/hooks/use-production-launch';

interface ProductionLaunchDashboardProps {
  className?: string;
}

export function ProductionLaunchDashboard({ className }: ProductionLaunchDashboardProps) {
  const {
    status,
    loading,
    executeFullLaunch,
    runSecurityValidation,
    runSystemValidation,
    runLoadTesting,
    activateMonitoring,
    runQuickHealthCheck
  } = useProductionLaunch();

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'validation': return <CheckCircle className="h-4 w-4" />;
      case 'load_testing': return <Zap className="h-4 w-4" />;
      case 'monitoring': return <Eye className="h-4 w-4" />;
      case 'completed': return <Rocket className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (phase: string) => {
    if (status.errors.length > 0) return 'destructive';
    if (loading) return 'default';
    return 'secondary';
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Production Launch Control</h2>
            <p className="text-muted-foreground">
              Execute the full production launch sequence with comprehensive validation
            </p>
          </div>
          <Button
            onClick={executeFullLaunch}
            disabled={loading}
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            <Rocket className="mr-2 h-4 w-4" />
            {loading ? 'Launching...' : 'Execute Full Launch'}
          </Button>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getPhaseIcon(status.phase)}
              Launch Status
            </CardTitle>
            <CardDescription>
              Current phase: {status.phase.replace('_', ' ').toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{status.message}</span>
              <Badge variant={getStatusColor(status.phase)}>
                {status.progress}%
              </Badge>
            </div>
            <Progress value={status.progress} className="w-full" />
            
            {status.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Launch Errors:</p>
                    {status.errors.map((error, index) => (
                      <p key={index} className="text-sm">• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Phase Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runSecurityValidation}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Run Security Check
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runSystemValidation}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Run System Tests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Load Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runLoadTesting}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Run Load Test
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={activateMonitoring}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Activate Monitoring
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Rapid checks and utilities for production management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={runQuickHealthCheck}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Activity className="mr-2 h-3 w-3" />
                Quick Health Check
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Launch Success */}
        {status.completed && status.errors.length === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-medium">🚀 Production Launch Successful!</p>
                <p className="text-sm">
                  Your platform is now live and ready for users. All systems are monitored and operational.
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Security Validated
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Performance Tested
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Monitoring Active
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
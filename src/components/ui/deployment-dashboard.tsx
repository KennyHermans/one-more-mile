import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, Rocket } from 'lucide-react';
import { useDeploymentAutomation } from '@/hooks/use-deployment-automation';

export function DeploymentDashboard() {
  const { activeDeployments, deploymentHistory, getDeploymentMetrics } = useDeploymentAutomation();
  const metrics = getDeploymentMetrics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Active Deployments</p>
                <p className="text-2xl font-bold">{activeDeployments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
              <Progress value={metrics.successRate} className="mt-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium">Total Deployments</p>
              <p className="text-2xl font-bold">{metrics.totalDeployments}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeDeployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDeployments.map((deployment) => (
                <div key={deployment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{deployment.config.environment}</h3>
                    <Badge variant={deployment.status === 'completed' ? 'default' : 'secondary'}>
                      {deployment.status}
                    </Badge>
                  </div>
                  <Progress value={(deployment.completedSteps / deployment.totalSteps) * 100} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {deployment.completedSteps}/{deployment.totalSteps} steps completed
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
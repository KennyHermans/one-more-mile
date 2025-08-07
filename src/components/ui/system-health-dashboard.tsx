import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

interface SystemHealthReport {
  senseiIssues: string[];
  tripIssues: string[];
  performanceIssues: string[];
  functionalIssues: string[];
  recommendations: string[];
}

export const SystemHealthDashboard = () => {
  const healthReport: SystemHealthReport = {
    senseiIssues: [
      '50% of senseis are at apprentice level - consider implementing progression incentives',
      'Limited sensei pool (2 active) may cause scheduling conflicts',
      'No inactive senseis being tracked for potential reactivation'
    ],
    tripIssues: [
      '63% of approved trips have no assigned sensei (7/11 trips)',
      '73% of trips lack backup sensei coverage (8/11 trips)',
      'High risk of trip cancellations due to insufficient sensei coverage',
      'No automated assignment system currently active'
    ],
    performanceIssues: [
      'Poor Web Vitals: First Contentful Paint = 5.66s (target: <1.8s)',
      'Poor Web Vitals: Largest Contentful Paint = 6.98s (target: <2.5s)',
      'DialogContent components missing accessibility descriptions'
    ],
    functionalIssues: [
      'Multiple versions of admin_update_sensei_level function detected',
      'Enhanced assignment system not yet integrated with UI',
      'Permission validation system needs real-time synchronization',
      'Backup sensei request system not actively being used'
    ],
    recommendations: [
      '🚨 URGENT: Implement automated sensei assignment for unassigned trips',
      '⚡ Optimize component rendering to improve Web Vitals',
      '🔧 Clean up duplicate database functions',
      '📊 Add real-time dashboard for assignment monitoring',
      '🎯 Integrate smart notification system for admins',
      '🔄 Enable automated backup sensei requests'
    ]
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'default';
    }
  };

  const getCriticalIssuesCount = () => {
    return healthReport.tripIssues.length + healthReport.functionalIssues.filter(issue => 
      issue.includes('Multiple versions') || issue.includes('not yet integrated')
    ).length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Health Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{getCriticalIssuesCount()}</div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{healthReport.performanceIssues.length}</div>
              <div className="text-sm text-muted-foreground">Performance Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">2</div>
              <div className="text-sm text-muted-foreground">Working Systems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthReport.recommendations.length}</div>
              <div className="text-sm text-muted-foreground">Recommendations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Critical Trip Management Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthReport.tripIssues.map((issue, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{issue}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Sensei Management Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Users className="h-5 w-5" />
            Sensei Management Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthReport.senseiIssues.map((issue, index) => (
            <Alert key={index}>
              <Clock className="h-4 w-4" />
              <AlertDescription>{issue}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Performance Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <TrendingUp className="h-5 w-5" />
            Performance & Technical Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthReport.performanceIssues.map((issue, index) => (
            <Alert key={index}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{issue}</AlertDescription>
            </Alert>
          ))}
          {healthReport.functionalIssues.map((issue, index) => (
            <Alert key={index + healthReport.performanceIssues.length}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{issue}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthReport.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Badge variant={rec.includes('🚨') ? 'destructive' : rec.includes('⚡') ? 'secondary' : 'outline'}>
                {rec.includes('🚨') ? 'URGENT' : rec.includes('⚡') ? 'HIGH' : 'MEDIUM'}
              </Badge>
              <div className="flex-1 text-sm">{rec}</div>
              <Button size="sm" variant="outline">
                Implement
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Working Systems ✅
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Sensei Management</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✅ Level updates working</li>
                <li>✅ Application processing</li>
                <li>✅ Status management</li>
                <li>✅ Permission system</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Trip Management</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✅ Trip CRUD operations</li>
                <li>✅ Data fetching & filtering</li>
                <li>✅ Sensei assignment UI</li>
                <li>✅ Permission validation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
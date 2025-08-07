import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  MapPin,
  Calendar,
  Activity
} from 'lucide-react';

export const AutomatedAssignmentSystem = () => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigningBackups, setIsAssigningBackups] = useState(false);
  const [lastResults, setLastResults] = useState<any>(null);
  const { toast } = useToast();

  const runAutoAssignment = async () => {
    setIsAssigning(true);
    try {
      const { data, error } = await supabase.rpc('auto_assign_unassigned_trips');
      
      if (error) throw error;

      const result = data as any;
      setLastResults(result);
      toast({
        title: "Auto-Assignment Complete",
        description: result?.message || `Assigned ${result?.assignments_made || 0} trips`,
      });
    } catch (error) {
      console.error('Auto-assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: "Unable to complete auto-assignment",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const runBackupAssignment = async () => {
    setIsAssigningBackups(true);
    try {
      const { data, error } = await supabase.rpc('auto_assign_backup_senseis');
      
      if (error) throw error;

      const result = data as any;
      toast({
        title: "Backup Assignment Complete", 
        description: result?.message || `Assigned ${result?.backup_assignments_made || 0} backup senseis`,
      });
    } catch (error) {
      console.error('Backup assignment error:', error);
      toast({
        title: "Backup Assignment Failed",
        description: "Unable to complete backup assignment",
        variant: "destructive",
      });
    } finally {
      setIsAssigningBackups(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automated Assignment System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={runAutoAssignment}
              disabled={isAssigning}
              className="flex items-center gap-2 h-20 text-left flex-col justify-center"
            >
              {isAssigning ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Users className="h-5 w-5" />
              )}
              <div>
                <div className="font-semibold">Assign Primary Senseis</div>
                <div className="text-xs opacity-80">Auto-assign unassigned trips</div>
              </div>
            </Button>

            <Button
              onClick={runBackupAssignment}
              disabled={isAssigningBackups}
              variant="outline"
              className="flex items-center gap-2 h-20 text-left flex-col justify-center"
            >
              {isAssigningBackups ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Users className="h-5 w-5" />
              )}
              <div>
                <div className="font-semibold">Assign Backup Senseis</div>
                <div className="text-xs opacity-80">Add backup coverage</div>
              </div>
            </Button>
          </div>

          {lastResults && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Last Assignment:</strong> {lastResults?.message || 'Assignment completed'}
                {lastResults?.assignments_made > 0 && (
                  <div className="mt-2">
                    <Badge variant="default">{lastResults.assignments_made} trips assigned</Badge>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Assignment Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Assignment Logic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Primary Assignment
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-green-600" />
                    Matches sensei specialties to trip theme
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-green-600" />
                    Checks sensei availability for trip dates
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-green-600" />
                    Prioritizes higher-rated senseis
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-green-600" />
                    Only assigns active senseis
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Backup Assignment
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-blue-600" />
                    Excludes primary sensei from backup options
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-blue-600" />
                    Uses same specialty matching logic
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-blue-600" />
                    Provides redundancy for trip coverage
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-blue-600" />
                    Creates admin alerts for assignments
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Automatic assignments</strong> only affect trips with status "approved" and active state.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>Date conflicts</strong> are automatically checked - senseis won't be double-booked.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                <strong>Specialty matching</strong> ensures the best fit between sensei expertise and trip themes.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useEnhancedAssignmentSystem } from '@/hooks/use-enhanced-assignment-system';
import { useSenseiReplacementSystem } from '@/hooks/use-sensei-replacement-system';
import { 
  Users, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Crown
} from 'lucide-react';

interface AssignmentManagerProps {
  tripId: string;
  currentSenseiId?: string;
  currentBackupId?: string;
  tripTheme: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  onAssignmentComplete?: (result: any) => void;
}

export const EnhancedAssignmentManager = ({
  tripId,
  currentSenseiId,
  currentBackupId,
  tripTheme,
  urgencyLevel = 'medium',
  onAssignmentComplete
}: AssignmentManagerProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showingBackups, setShowingBackups] = useState(false);
  
  const {
    isProcessing,
    assignmentHistory,
    findOptimalSenseiMatches,
    executeSmartAssignment,
    requestBackupSenseis,
    resolveAssignmentConflicts
  } = useEnhancedAssignmentSystem();

  const {
    handleSenseiReplacement,
    checkPermissionCompatibility,
    isProcessing: isReplacementProcessing
  } = useSenseiReplacementSystem();

  useEffect(() => {
    loadMatches();
    checkConflicts();
  }, [tripId]);

  const loadMatches = async () => {
    try {
      const results = await findOptimalSenseiMatches({
        tripId,
        requirementType: 'primary',
        urgencyLevel
      });
      setMatches(results);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const checkConflicts = async () => {
    const foundConflicts = await resolveAssignmentConflicts(tripId);
    setConflicts(foundConflicts);
  };

  const handleSmartAssignment = async (type: 'primary' | 'backup') => {
    const result = await executeSmartAssignment({
      tripId,
      primarySenseiId: currentSenseiId,
      requirementType: type,
      urgencyLevel
    });

    if (result.success) {
      await loadMatches();
      onAssignmentComplete?.(result);
    }
  };

  const handleAssignMatch = async (senseiId: string, isBackup: boolean = false) => {
    const result = await executeSmartAssignment({
      tripId,
      primarySenseiId: isBackup ? currentSenseiId : senseiId,
      requirementType: isBackup ? 'backup' : 'primary',
      urgencyLevel: urgencyLevel || 'medium',
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    });
    
    if (result.success) {
      await loadMatches();
      onAssignmentComplete?.(result);
    }
  };

  const handleReplacementAssignment = async (senseiId: string) => {
    if (!currentSenseiId) return;

    const result = await handleSenseiReplacement({
      tripId,
      currentSenseiId,
      newSenseiId: senseiId,
      reason: 'Replacement assignment through enhanced assignment manager'
    });

    if (result.success) {
      await loadMatches();
      onAssignmentComplete?.(result);
    }
  };

  const handleBackupRequest = async () => {
    const success = await requestBackupSenseis(tripId, 3);
    if (success) {
      setShowingBackups(true);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Smart Assignment Manager
            </div>
            <Badge variant={getUrgencyColor(urgencyLevel)}>
              {urgencyLevel.toUpperCase()} PRIORITY
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Assignments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Sensei</label>
              <div className="flex items-center gap-2">
                {currentSenseiId ? (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Assigned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Needs Assignment
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Backup Sensei</label>
              <div className="flex items-center gap-2">
                {currentBackupId ? (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Assigned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Optional
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Conflict Alerts */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Assignment Conflicts Detected:</div>
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm">• {conflict}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleSmartAssignment('primary')}
              disabled={isProcessing || !!currentSenseiId}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Auto-Assign Primary
            </Button>
            
            <Button
              onClick={() => handleSmartAssignment('backup')}
              disabled={isProcessing || !!currentBackupId}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Auto-Assign Backup
            </Button>
            
            <Button
              onClick={handleBackupRequest}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Request Backups
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sensei Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Optimal Sensei Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Loading optimal matches...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.slice(0, 5).map((match, index) => (
                <div key={match.senseiId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{match.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Match Score: {match.weightedScore.toFixed(1)}/20
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={match.autoAssignable ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {match.autoAssignable ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Auto-Assignable
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            Review Required
                          </>
                        )}
                      </Badge>
                      
                      <Badge 
                        variant="outline" 
                        className={getRiskColor(match.conflictRisk)}
                      >
                        {match.conflictRisk.toUpperCase()} Risk
                      </Badge>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Specialty Matches</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.specialtyMatches.map((specialty: string) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-muted-foreground">Status</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={match.availability ? "default" : "destructive"}>
                          {match.availability ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {match.missingRequirements.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium text-muted-foreground">Missing Requirements</div>
                      <div className="text-red-600 mt-1">
                        {match.missingRequirements.join(', ')}
                      </div>
                    </div>
                  )}

                  <Separator />
                  
                   <div className="flex justify-end gap-2">
                     <Button size="sm" variant="outline">
                       View Profile
                     </Button>
                     <Button
                       size="sm"
                       onClick={() => currentSenseiId ? handleReplacementAssignment(match.senseiId) : handleAssignMatch(match.senseiId)}
                       disabled={isProcessing || isReplacementProcessing}
                     >
                       {currentSenseiId ? (
                         <>
                           <Crown className="h-4 w-4 mr-1" />
                           Replace & Elevate
                         </>
                       ) : (
                         'Assign Primary'
                       )}
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => handleAssignMatch(match.senseiId, true)} disabled={isProcessing}>
                       Assign Backup
                     </Button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment History */}
      {assignmentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Assignment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignmentHistory.slice(-3).map((entry, index) => (
                <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-between">
                    <span>{entry.recommendedAction}</span>
                    <Badge variant={entry.success ? "default" : "secondary"}>
                      {entry.success ? "Success" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
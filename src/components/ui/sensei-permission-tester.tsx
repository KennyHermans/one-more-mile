import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSenseiPermissions } from '@/hooks/use-sensei-permissions';
import { useAdminSenseiManagement } from '@/hooks/use-admin-sensei-management';
import { useToast } from '@/hooks/use-toast';

interface PermissionTestResult {
  testName: string;
  passed: boolean;
  message: string;
  timestamp: string;
}

export const SenseiPermissionTester: React.FC = () => {
  const [testResults, setTestResults] = useState<PermissionTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSenseiId, setSelectedSenseiId] = useState<string>('');
  const { senseis, updateSenseiLevel } = useAdminSenseiManagement();
  const { permissions, refreshPermissions, currentLevel } = useSenseiPermissions(selectedSenseiId);
  const { toast } = useToast();

  // Find a test sensei (preferably Kenny)
  useEffect(() => {
    if (senseis.length > 0 && !selectedSenseiId) {
      const testSensei = senseis.find(s => s.name.toLowerCase().includes('kenny')) || senseis[0];
      setSelectedSenseiId(testSensei.id);
    }
  }, [senseis, selectedSenseiId]);

  const addTestResult = (testName: string, passed: boolean, message: string) => {
    const result: PermissionTestResult = {
      testName,
      passed,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev]);
  };

  const runPermissionTest = async () => {
    if (!selectedSenseiId) {
      addTestResult('Setup', false, 'No sensei selected for testing');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Get current permissions
      addTestResult('Initial Check', true, `Starting test with sensei level: ${currentLevel}`);
      
      // Test 2: Check current permissions
      const initialPerms = permissions;
      const canEditTripsInitially = initialPerms?.can_edit_trips || false;
      const canCreateTripsInitially = initialPerms?.can_create_trips || false;
      
      addTestResult(
        'Permission Check', 
        true, 
        `Initial permissions - Edit: ${canEditTripsInitially}, Create: ${canCreateTripsInitially}`
      );

      // Test 3: Change level to journey_guide if apprentice, or to apprentice if higher
      const newLevel = currentLevel === 'apprentice' ? 'journey_guide' : 'apprentice';
      addTestResult('Level Change', true, `Changing level from ${currentLevel} to ${newLevel}`);
      
      const updateResult = await updateSenseiLevel(selectedSenseiId, newLevel, 'Permission testing');
      
      if (!updateResult.success) {
        addTestResult('Level Change', false, `Failed to update level: ${updateResult.error}`);
        return;
      }

      addTestResult('Level Change', true, `Successfully changed level to ${newLevel}`);

      // Test 4: Wait and refresh permissions
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshPermissions();

      // Test 5: Check if permissions changed
      const newPerms = permissions;
      const canEditTripsAfter = newPerms?.can_edit_trips || false;
      const canCreateTripsAfter = newPerms?.can_create_trips || false;

      const permissionsChanged = 
        canEditTripsInitially !== canEditTripsAfter || 
        canCreateTripsInitially !== canCreateTripsAfter;

      addTestResult(
        'Permission Update',
        permissionsChanged,
        `New permissions - Edit: ${canEditTripsAfter}, Create: ${canCreateTripsAfter}. Changed: ${permissionsChanged ? 'Yes' : 'No'}`
      );

      // Test 6: Test field-level permissions
      try {
        const { data: fieldPermissions, error: fieldError } = await supabase
          .from('sensei_level_field_permissions')
          .select('field_name, can_edit')
          .eq('sensei_level', newLevel);

        if (fieldError) throw fieldError;

        const editableFields = fieldPermissions?.filter(p => p.can_edit).length || 0;
        addTestResult(
          'Field Permissions',
          true,
          `Level ${newLevel} can edit ${editableFields} fields`
        );
      } catch (error) {
        addTestResult('Field Permissions', false, `Failed to check field permissions: ${error}`);
      }

      // Test 7: Change level back
      const originalLevel = currentLevel === 'apprentice' ? 'journey_guide' : 'apprentice';
      const revertResult = await updateSenseiLevel(selectedSenseiId, originalLevel, 'Reverting test changes');
      
      addTestResult(
        'Level Revert',
        revertResult.success,
        revertResult.success ? 
          `Successfully reverted to ${originalLevel}` : 
          `Failed to revert: ${revertResult.error}`
      );

    } catch (error) {
      addTestResult('Test Error', false, `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testSensei = senseis.find(s => s.id === selectedSenseiId);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Sensei Permission System Tester
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test if sensei permissions update correctly when admin changes their level
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Subject */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h3 className="font-medium">Test Subject</h3>
            {testSensei && (
              <p className="text-sm text-muted-foreground">
                {testSensei.name} - Current Level: <Badge variant="outline">{currentLevel}</Badge>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={runPermissionTest} 
              disabled={isRunning || !selectedSenseiId}
              size="sm"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
            <Button onClick={clearResults} variant="outline" size="sm" disabled={isRunning}>
              Clear Results
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Test Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{result.testName}</p>
                      <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100">How this test works:</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
            <li>Checks current sensei permissions and level</li>
            <li>Changes the sensei level using admin function</li>
            <li>Verifies that permissions are updated correctly</li>
            <li>Tests field-level permissions for the new level</li>
            <li>Reverts the sensei back to original level</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
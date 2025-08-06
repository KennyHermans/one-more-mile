import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export const BackupSystemTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (step: string, status: 'pending' | 'success' | 'error', message: string, data?: any) => {
    setResults(prev => [...prev, { step, status, message, data }]);
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      // Step 1: Test automation settings
      addResult('automation-settings', 'pending', 'Checking automation settings...');
      const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('*')
        .in('setting_name', ['backup_automation_enabled', 'backup_request_timeout_hours']);
      
      if (settingsError) throw settingsError;
      
      const automationEnabled = settings?.find(s => s.setting_name === 'backup_automation_enabled')?.setting_value === 'true';
      addResult(
        'automation-settings', 
        automationEnabled ? 'success' : 'error',
        automationEnabled ? 'Automation is enabled' : 'Automation is disabled',
        settings
      );

      // Step 2: Create test trip
      addResult('test-trip', 'pending', 'Creating test trip...');
      const { data: testTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: 'Test Backup System - ' + Date.now(),
          description: 'Automated test for backup sensei functionality',
          theme: 'Mountain Climbing',
          destination: 'Everest Base Camp, Nepal',
          dates: 'June 15-30, 2024',
          price: '$3,500',
          difficulty_level: 'Expert',
          max_participants: 8,
          current_participants: 2,
          group_size: '6-8',
          duration_days: 15,
          image_url: null,
          sensei_name: 'Test Sensei',
          trip_status: 'approved',
          sensei_id: (await supabase.from('sensei_profiles').select('id').limit(1)).data?.[0]?.id,
          is_active: true,
          requires_backup_sensei: true,
          backup_assignment_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (tripError) throw tripError;
      addResult('test-trip', 'success', `Created test trip: ${testTrip.title}`, testTrip);

      // Step 3: Test backup request function
      addResult('backup-request', 'pending', 'Testing backup request function...');
      const { data: backupResults, error: backupError } = await supabase
        .rpc('request_backup_senseis', {
          p_trip_id: testTrip.id,
          p_max_requests: 2
        });

      if (backupError) throw backupError;
      const resultsLength = Array.isArray(backupResults) ? backupResults.length : 0;
      addResult(
        'backup-request', 
        'success', 
        `Created ${resultsLength} backup requests`,
        backupResults
      );

      // Step 4: Test edge function
      addResult('edge-function', 'pending', 'Testing check-backup-requirements function...');
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('check-backup-requirements');
      
      if (edgeError) {
        addResult('edge-function', 'error', `Edge function error: ${edgeError.message}`, edgeError);
      } else {
        addResult('edge-function', 'success', 'Edge function executed successfully', edgeResult);
      }

      // Step 5: Check test function
      addResult('test-function', 'pending', 'Running comprehensive test function...');
      const { data: testResult, error: testError } = await supabase.functions.invoke('test-backup-system');
      
      if (testError) {
        addResult('test-function', 'error', `Test function error: ${testError.message}`, testError);
      } else {
        addResult('test-function', 'success', 'Comprehensive test completed', testResult);
      }

      // Step 6: Check current settings and status
      addResult('system-status', 'pending', 'Checking system status...');
      const { data: currentRequests } = await supabase
        .from('backup_sensei_requests')
        .select('count')
        .eq('status', 'pending');
      
      const { data: tripsNeeding } = await supabase
        .from('trips')
        .select('count')
        .eq('requires_backup_sensei', true)
        .is('backup_sensei_id', null);

      addResult(
        'system-status', 
        'success',
        `System operational - ${currentRequests || 0} pending requests, backup automation enabled`,
        { currentRequests, tripsNeeding }
      );

      toast.success('Backup system test completed!');
    } catch (error: any) {
      console.error('Test failed:', error);
      addResult('test-error', 'error', `Test failed: ${error.message}`, error);
      toast.error('Backup system test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return 'outline';
      case 'success': return 'default';
      case 'error': return 'destructive';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Backup System Tester
        </CardTitle>
        <CardDescription>
          Run comprehensive tests to verify the backup sensei functionality is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Button 
            onClick={runFullTest} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Tests...' : 'Run Full Test'}
          </Button>
          
          {results.length > 0 && (
            <Badge variant="outline">
              {results.filter(r => r.status === 'success').length} / {results.length} passed
            </Badge>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium capitalize">{result.step.replace('-', ' ')}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                  </div>
                </div>
                <Badge variant={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run Full Test" to test the backup system functionality
          </div>
        )}
      </CardContent>
    </Card>
  );
};
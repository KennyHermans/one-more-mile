import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RefreshCw,
  Activity,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { useProductionValidation } from '@/hooks/use-deployment-automation';
import { ValidationResult, ValidationSuite } from '@/lib/production-validation';

interface ProductionValidationDashboardProps {
  className?: string;
}

export function ProductionValidationDashboard({ className }: ProductionValidationDashboardProps) {
  const {
    validationResults,
    isValidating,
    error,
    runValidation,
    getValidationSuites
  } = useProductionValidation();

  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [availableSuites, setAvailableSuites] = useState<ValidationSuite[]>([]);
  const [lastValidationTime, setLastValidationTime] = useState<Date | null>(null);

  useEffect(() => {
    loadAvailableSuites();
  }, []);

  const loadAvailableSuites = async () => {
    try {
      const suites = await getValidationSuites();
      setAvailableSuites(suites);
      setSelectedSuites(suites.filter(s => s.required).map(s => s.name));
    } catch (error) {
      console.error('Failed to load validation suites:', error);
    }
  };

  const handleRunValidation = async () => {
    try {
      await runValidation(selectedSuites.length > 0 ? selectedSuites : undefined);
      setLastValidationTime(new Date());
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'skipped': return <Clock className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'skipped': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'functionality': return <Activity className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'integration': return <Globe className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  const getOverallStatus = () => {
    if (!validationResults) return 'unknown';
    if (validationResults.summary.failed > 0) return 'failed';
    if (validationResults.summary.warnings > 0) return 'warning';
    return 'passed';
  };

  const getSuccessRate = () => {
    if (!validationResults) return 0;
    const { passed, total } = validationResults.summary;
    return total > 0 ? (passed / total) * 100 : 0;
  };

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Validation Error: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production Validation</h2>
          <p className="text-muted-foreground">
            Comprehensive system validation and testing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunValidation}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isValidating ? 'Running...' : 'Run Validation'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {validationResults && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(getOverallStatus())}
                <div>
                  <p className="text-sm font-medium">Overall Status</p>
                  <p className={`text-lg font-bold ${getStatusColor(getOverallStatus())}`}>
                    {getOverallStatus().toUpperCase()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{getSuccessRate().toFixed(1)}%</p>
                <Progress value={getSuccessRate()} className="mt-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tests Passed</p>
                <p className="text-2xl font-bold text-green-600">
                  {validationResults.summary.passed}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {validationResults.summary.total} total
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">
                  {formatDuration(validationResults.summary.duration)}
                </p>
                {lastValidationTime && (
                  <p className="text-xs text-muted-foreground">
                    {lastValidationTime.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {validationResults ? (
            <div className="space-y-6">
              {Object.entries(validationResults.suiteResults).map(([suiteName, results]) => {
                const validationResults = results as ValidationResult[];
                return (
                <Card key={suiteName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(suiteName)}
                      {suiteName.replace('_', ' ').toUpperCase()}
                      <Badge variant="outline">
                        {validationResults.filter(r => r.status === 'passed').length}/{validationResults.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {availableSuites.find(s => s.name === suiteName)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {validationResults.map((result: ValidationResult, index: number) => (
                        <div key={result.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="flex-shrink-0 mt-0.5">
                            {getStatusIcon(result.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{result.name}</h4>
                              <span className="text-sm text-muted-foreground">
                                {formatDuration(result.duration)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.message}
                            </p>
                            {result.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">
                                  View Details
                                </summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                 </Card>
                );
               })}
             </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No validation results</h3>
                  <p className="text-muted-foreground mb-4">
                    Run validation tests to see results here
                  </p>
                  <Button onClick={handleRunValidation} disabled={isValidating}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Validation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Test Suites</CardTitle>
              <CardDescription>
                Select which test suites to include in validation runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableSuites.map((suite) => (
                  <div key={suite.name} className="flex items-start gap-3 p-4 border rounded-lg">
                    <input
                      type="checkbox"
                      id={suite.name}
                      checked={selectedSuites.includes(suite.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSuites(prev => [...prev, suite.name]);
                        } else {
                          setSelectedSuites(prev => prev.filter(s => s !== suite.name));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor={suite.name} className="font-medium cursor-pointer">
                          {suite.name.replace('_', ' ').toUpperCase()}
                        </label>
                        {suite.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {suite.tests.length} tests
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suite.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Parallel: {suite.parallel ? 'Yes' : 'No'}</span>
                        <span>Required Tests: {suite.tests.filter(t => t.required).length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Configuration</CardTitle>
              <CardDescription>
                Current validation environment and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Environment</label>
                    <p className="text-sm text-muted-foreground">
                      {validationResults?.environment || 'Not detected'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Version</label>
                    <p className="text-sm text-muted-foreground">
                      {validationResults?.version || '1.0.0'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Run</label>
                    <p className="text-sm text-muted-foreground">
                      {lastValidationTime ? lastValidationTime.toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Auto Refresh</label>
                    <p className="text-sm text-muted-foreground">Disabled</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Performance Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Page Load:</span>
                      <span className="ml-2">3s warning, 5s critical</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">API Response:</span>
                      <span className="ml-2">1s warning, 2s critical</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Memory Usage:</span>
                      <span className="ml-2">70% warning, 90% critical</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Rate:</span>
                      <span className="ml-2">2% warning, 5% critical</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
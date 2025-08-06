import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Bug, Clock } from 'lucide-react';
import { performanceMonitor } from '@/lib/performance-monitor';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enablePerformanceTracking?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  performanceData: any;
  retryCount: number;
}

export class PerformanceErrorBoundary extends Component<Props, State> {
  private performanceStart: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      performanceData: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture performance data at time of error
    const performanceData = this.props.enablePerformanceTracking 
      ? performanceMonitor.getPerformanceSummary()
      : null;

    this.setState({
      errorInfo,
      performanceData,
    });

    // Log error with performance context
    console.error('Error caught by PerformanceErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      performanceData,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Record error metric
    if (this.props.enablePerformanceTracking) {
      performanceMonitor.recordMetric({
        name: 'component-error',
        value: Date.now() - this.performanceStart,
        timestamp: Date.now(),
        metadata: {
          errorMessage: error.message,
          componentStack: errorInfo.componentStack,
          retryCount: this.state.retryCount,
        },
      });
    }

    // Show error toast
    toast({
      title: 'Component Error',
      description: 'An error occurred while rendering the component. Performance data has been captured.',
      variant: 'destructive',
    });
  }

  componentDidMount() {
    this.performanceStart = performance.now();
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      performanceData: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Track retry attempts
    if (this.props.enablePerformanceTracking) {
      performanceMonitor.recordMetric({
        name: 'error-boundary-retry',
        value: this.state.retryCount + 1,
        timestamp: Date.now(),
        metadata: {
          errorMessage: this.state.error?.message,
        },
      });
    }
  };

  handleReportError = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      performanceData: this.state.performanceData,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    // In a real app, you'd send this to your error reporting service
    console.log('Error report:', errorReport);
    
    toast({
      title: 'Error Reported',
      description: 'Error details have been logged for investigation.',
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with performance insights
      return (
        <Card className="max-w-2xl mx-auto my-8 border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  A component error occurred. Performance data has been captured to help diagnose the issue.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Error Details
              </h4>
              <p className="text-sm text-muted-foreground font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Retry attempts: {this.state.retryCount}
                </p>
              )}
            </div>

            {/* Performance Data */}
            {this.state.performanceData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Performance Context
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Metrics:</span>
                    <span className="ml-2 font-medium">
                      {this.state.performanceData.summary.totalMetrics}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slow Operations:</span>
                    <span className="ml-2 font-medium">
                      {this.state.performanceData.summary.slowOperations}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Response Time:</span>
                    <span className="ml-2 font-medium">
                      {this.state.performanceData.summary.averageResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Web Vitals Score:</span>
                    <span className="ml-2 font-medium">
                      {this.state.performanceData.summary.webVitalsScore.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleRetry}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                onClick={this.handleReportError}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Report Error
              </Button>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="bg-muted/50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium mb-2">
                  Development Details
                </summary>
                <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">
                  {this.state.error?.stack}
                </pre>
                <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withPerformanceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: ReactNode;
    enablePerformanceTracking?: boolean;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <PerformanceErrorBoundary {...options}>
      <Component {...props} />
    </PerformanceErrorBoundary>
  );

  WrappedComponent.displayName = `withPerformanceErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
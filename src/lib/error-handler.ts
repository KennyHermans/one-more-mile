import { toast } from '@/hooks/use-toast';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  tripId?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVEL: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Enhanced logging with structured data for production monitoring
interface LogEntry {
  level: keyof LogLevel;
  message: string;
  context?: ErrorContext;
  stack?: string;
  timestamp: string;
  sessionId?: string;
  buildVersion?: string;
}

class ErrorHandler {
  private isDevelopment = import.meta.env.DEV;
  private sessionId = this.generateSessionId();
  private errorQueue = new Set<string>();
  private isLogging = false;

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(level: keyof LogLevel, message: string, context?: ErrorContext, stack?: string): LogEntry {
    return {
      level,
      message,
      context: {
        ...context,
        userAgent: navigator?.userAgent,
        url: window?.location?.href,
      },
      stack,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      buildVersion: import.meta.env.VITE_APP_VERSION || 'unknown'
    };
  }

  private sendToProduction(logEntry: LogEntry) {
    // In production, send to monitoring service (Sentry, LogRocket, etc.)
    if (!this.isDevelopment) {
      // Placeholder for production logging service
      // Example: sentry.captureMessage(logEntry.message, logEntry.level);
    }
  }

  logError(error: Error | string, context?: ErrorContext) {
    // Prevent circular logging and infinite loops
    if (this.isLogging) return;
    
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Skip certain errors that cause infinite loops
    if (errorMessage.includes('Maximum call stack') || 
        errorMessage.includes('RealtimeClient') ||
        errorMessage.includes('GlobalErrorProvider')) {
      return;
    }

    // Prevent duplicate errors
    const errorKey = `${errorMessage}_${context?.component}`;
    if (this.errorQueue.has(errorKey)) return;
    
    this.errorQueue.add(errorKey);
    this.isLogging = true;
    
    try {
      const logEntry = this.createLogEntry('ERROR', errorMessage, context, errorStack);
      
      if (this.isDevelopment) {
        // Use native console methods to avoid overrides
        console.warn('[ERROR]', logEntry);
      }
      
      this.sendToProduction(logEntry);
    } finally {
      this.isLogging = false;
      // Clean up error queue after a delay
      setTimeout(() => this.errorQueue.delete(errorKey), 5000);
    }
  }

  logWarning(message: string, context?: ErrorContext) {
    const logEntry = this.createLogEntry('WARN', message, context);
    
    if (this.isDevelopment) {
      console.warn('[WARN]', logEntry);
    }
    
    this.sendToProduction(logEntry);
  }

  logInfo(message: string, context?: ErrorContext) {
    const logEntry = this.createLogEntry('INFO', message, context);
    
    if (this.isDevelopment) {
      console.info('[INFO]', logEntry);
    }
    
    this.sendToProduction(logEntry);
  }

  logDebug(message: string, context?: ErrorContext) {
    if (this.isDevelopment) {
      const logEntry = this.createLogEntry('DEBUG', message, context);
      console.debug('[DEBUG]', logEntry);
    }
  }

  handleError(
    error: Error | string, 
    context?: ErrorContext, 
    showToast: boolean = true,
    toastTitle?: string
  ) {
    this.logError(error, context);
    
    if (showToast) {
      toast({
        title: toastTitle || "Error",
        description: error instanceof Error ? error.message : error,
        variant: "destructive"
      });
    }
  }

  handleAsyncError(
    asyncFn: () => Promise<any>,
    context?: ErrorContext,
    showToast: boolean = true,
    toastTitle?: string
  ) {
    return async (...args: any[]) => {
      try {
        return await asyncFn.apply(this, args);
      } catch (error) {
        this.handleError(error as Error, context, showToast, toastTitle);
        throw error; // Re-throw to allow component-level handling if needed
      }
    };
  }

  // Wrapper for database operations
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
      return fallbackValue;
    }
  }

  // Silent error logging (no toast)
  logSilent(error: Error | string, context?: ErrorContext) {
    this.logError(error, context);
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Convenience functions
export const logError = (error: Error | string, context?: ErrorContext) => 
  errorHandler.logError(error, context);

export const logWarning = (message: string, context?: ErrorContext) => 
  errorHandler.logWarning(message, context);

export const logInfo = (message: string, context?: ErrorContext) => 
  errorHandler.logInfo(message, context);

export const logDebug = (message: string, context?: ErrorContext) => 
  errorHandler.logDebug(message, context);

export const handleError = (
  error: Error | string, 
  context?: ErrorContext, 
  showToast?: boolean,
  toastTitle?: string
) => errorHandler.handleError(error, context, showToast, toastTitle);

export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallbackValue?: T
) => errorHandler.withErrorHandling(operation, context, fallbackValue);
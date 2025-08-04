import { toast } from '@/hooks/use-toast';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  tripId?: string;
  metadata?: Record<string, any>;
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

class ErrorHandler {
  private isDevelopment = import.meta.env.DEV;

  logError(error: Error | string, context?: ErrorContext) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (this.isDevelopment) {
      console.error('[ERROR]', {
        message: errorMessage,
        stack: errorStack,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // In production, you could send to error tracking service like Sentry
    // this.sendToErrorService(error, context);
  }

  logWarning(message: string, context?: ErrorContext) {
    if (this.isDevelopment) {
      console.warn('[WARN]', {
        message,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }

  logInfo(message: string, context?: ErrorContext) {
    if (this.isDevelopment) {
      console.info('[INFO]', {
        message,
        context,
        timestamp: new Date().toISOString()
      });
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
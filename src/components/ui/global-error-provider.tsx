import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logError, logInfo } from '@/lib/error-handler';

interface GlobalErrorContextType {
  errors: Error[];
  addError: (error: Error) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within GlobalErrorProvider');
  }
  return context;
};

interface GlobalErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
}

export const GlobalErrorProvider = ({ 
  children, 
  maxErrors = 10 
}: GlobalErrorProviderProps) => {
  const [errors, setErrors] = useState<Error[]>([]);

  const addError = (error: Error) => {
    setErrors(prev => {
      const newErrors = [error, ...prev].slice(0, maxErrors);
      logError(error, {
        component: 'GlobalErrorProvider',
        action: 'addError',
        metadata: { totalErrors: newErrors.length }
      });
      return newErrors;
    });
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
    logInfo('All errors cleared', {
      component: 'GlobalErrorProvider',
      action: 'clearErrors'
    });
  };

  // Global error handlers
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addError(new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addError(new Error(event.reason?.message || 'Unhandled promise rejection'));
    };

    // Capture React errors that escape error boundaries
    const handleReactError = (error: Error) => {
      addError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Override console.error to catch React errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('React') || message.includes('Warning:')) {
        handleReactError(new Error(message));
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <GlobalErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </GlobalErrorContext.Provider>
  );
};
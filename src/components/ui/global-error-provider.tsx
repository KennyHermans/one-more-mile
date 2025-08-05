import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  const errorQueue = new Set<string>();

  const addError = (error: Error) => {
    // Prevent duplicate errors and circular dependencies
    const errorKey = `${error.message}_${error.stack?.slice(0, 100)}`;
    if (errorQueue.has(errorKey)) return;
    
    errorQueue.add(errorKey);
    
    setErrors(prev => {
      const newErrors = [error, ...prev].slice(0, maxErrors);
      // Use native console to avoid circular dependency
      if (import.meta.env.DEV) {
        console.warn('[GlobalErrorProvider] Error added:', error.message);
      }
      return newErrors;
    });

    // Clean up error queue after a delay
    setTimeout(() => errorQueue.delete(errorKey), 5000);
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
    errorQueue.clear();
    if (import.meta.env.DEV) {
      console.info('[GlobalErrorProvider] All errors cleared');
    }
  };

  // Global error handlers (simplified to prevent loops)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Skip certain errors to prevent infinite loops
      if (event.message.includes('RealtimeClient') || 
          event.message.includes('Maximum call stack') ||
          event.message.includes('GlobalErrorProvider')) {
        return;
      }
      addError(new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason || 'Unhandled promise rejection';
      if (typeof reason === 'string' && (
          reason.includes('RealtimeClient') || 
          reason.includes('Maximum call stack'))) {
        return;
      }
      addError(new Error(reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <GlobalErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </GlobalErrorContext.Provider>
  );
};
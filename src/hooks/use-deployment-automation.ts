import { useState, useEffect, useCallback } from 'react';
import { 
  deploymentAutomation, 
  DeploymentConfig, 
  DeploymentStatus, 
  RollbackPlan 
} from '@/lib/deployment-automation';

export interface UseDeploymentAutomationReturn {
  // State
  activeDeployments: DeploymentStatus[];
  deploymentHistory: DeploymentStatus[];
  selectedDeployment: DeploymentStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startDeployment: (config: DeploymentConfig) => Promise<string>;
  rollbackDeployment: (deploymentId: string, targetVersion: string) => Promise<string>;
  cancelDeployment: (deploymentId: string) => Promise<void>;
  refreshDeployments: () => void;
  selectDeployment: (deploymentId: string) => void;
  
  // Utilities
  getDeploymentMetrics: () => {
    totalDeployments: number;
    successRate: number;
    averageDuration: number;
    recentDeployments: DeploymentStatus[];
  };
  generateRollbackPlan: (deploymentId: string, targetVersion: string) => RollbackPlan | null;
}

export function useDeploymentAutomation(): UseDeploymentAutomationReturn {
  const [activeDeployments, setActiveDeployments] = useState<DeploymentStatus[]>([]);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentStatus[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDeployments = useCallback(() => {
    try {
      setActiveDeployments(deploymentAutomation.getActiveDeployments());
      setDeploymentHistory(deploymentAutomation.getDeploymentHistory());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh deployments');
    }
  }, []);

  const startDeployment = useCallback(async (config: DeploymentConfig): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const deploymentId = await deploymentAutomation.startDeployment(config);
      refreshDeployments();
      return deploymentId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start deployment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshDeployments]);

  const rollbackDeployment = useCallback(async (deploymentId: string, targetVersion: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const rollbackId = await deploymentAutomation.rollbackDeployment(deploymentId, targetVersion);
      refreshDeployments();
      return rollbackId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rollback deployment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshDeployments]);

  const cancelDeployment = useCallback(async (deploymentId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deploymentAutomation.cancelDeployment(deploymentId);
      refreshDeployments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel deployment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshDeployments]);

  const selectDeployment = useCallback((deploymentId: string) => {
    const deployment = deploymentAutomation.getDeploymentById(deploymentId);
    setSelectedDeployment(deployment || null);
  }, []);

  const getDeploymentMetrics = useCallback(() => {
    return deploymentAutomation.getDeploymentMetrics();
  }, []);

  const generateRollbackPlan = useCallback((deploymentId: string, targetVersion: string): RollbackPlan | null => {
    try {
      return deploymentAutomation.generateRollbackPlan(deploymentId, targetVersion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate rollback plan');
      return null;
    }
  }, []);

  // Auto-refresh active deployments
  useEffect(() => {
    refreshDeployments();
    
    const interval = setInterval(() => {
      refreshDeployments();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [refreshDeployments]);

  return {
    // State
    activeDeployments,
    deploymentHistory,
    selectedDeployment,
    isLoading,
    error,
    
    // Actions
    startDeployment,
    rollbackDeployment,
    cancelDeployment,
    refreshDeployments,
    selectDeployment,
    
    // Utilities
    getDeploymentMetrics,
    generateRollbackPlan
  };
}

export function useProductionValidation() {
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(async (suiteNames?: string[]) => {
    setIsValidating(true);
    setError(null);
    
    try {
      // Import productionValidation dynamically to avoid circular dependencies
      const { productionValidation } = await import('@/lib/production-validation');
      const results = await productionValidation.runValidation(suiteNames);
      setValidationResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const getValidationSuites = useCallback(async () => {
    try {
      const { productionValidation } = await import('@/lib/production-validation');
      return productionValidation.getValidationSuites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get validation suites');
      return [];
    }
  }, []);

  return {
    validationResults,
    isValidating,
    error,
    runValidation,
    getValidationSuites
  };
}
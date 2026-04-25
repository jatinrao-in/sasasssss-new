import { useCallback, useState } from 'react';
import { getDashboardInsights } from '../lib/api';

/**
 * Global AI Manager Hook
 * Routes AI calls through the protected server API.
 */
export function useAIManager() {
  const [isProcessing, setIsProcessing] = useState(false);

  const generateInsights = useCallback(async (dashboardData) => {
    setIsProcessing(true);
    try {
      const response = await getDashboardInsights(dashboardData);
      return response.summary || 'Unable to generate insights at this moment.';
    } catch (error) {
      console.error('Insight generation failed:', error);
      return 'Unable to generate insights at this moment.';
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    generateInsights,
  };
}

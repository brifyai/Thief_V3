import { useState, useCallback } from 'react';
import { retestService, type RetestRequest, type RetestResult } from '@/services/retest.service';
import { toast } from 'react-hot-toast';

interface UseRetestUrlOptions {
  onSuccess?: (result: RetestResult) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface RetestState {
  isLoading: boolean;
  result: RetestResult | null;
  error: Error | null;
}

export const useRetestUrl = (options: UseRetestUrlOptions = {}) => {
  const [state, setState] = useState<RetestState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      result: null,
      error: null,
    });
  }, []);

  const retestUrl = useCallback(async (urlId: number, request: RetestRequest = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await retestService.retestUrl(urlId, request);
      
      // Generar resumen de cambios
      const comparison = retestService.generateComparisonSummary(result);
      
      // Mostrar notificación apropiada
      if (comparison.hasChanges) {
        toast.success(`✅ Re-test completado: ${comparison.summary}`);
      } else {
        toast.success('✅ Re-test completado: Sin cambios significativos');
      }

      setState({
        isLoading: false,
        result,
        error: null,
      });

      options.onSuccess?.(result);
      options.onComplete?.();

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Error desconocido');
      
      toast.error(errorObj.message);
      
      setState({
        isLoading: false,
        result: null,
        error: errorObj,
      });

      options.onError?.(errorObj);
      options.onComplete?.();

      throw errorObj;
    }
  }, [options]);

  const validateNewLimit = useCallback((newLimit: number | undefined, availableCount: number) => {
    return retestService.validateNewLimit(newLimit, availableCount);
  }, []);

  const getUrlTestInfo = useCallback((url: {
    id: number;
    last_tested_at?: string | null;
    max_news_limit?: number | null;
    available_news_count?: number | null;
  }) => {
    return retestService.getUrlTestInfo(url);
  }, []);

  const formatTestStatus = useCallback((url: {
    id: number;
    last_tested_at?: string | null;
    max_news_limit?: number | null;
    available_news_count?: number | null;
  }) => {
    const testInfo = getUrlTestInfo(url);
    return retestService.formatTestStatus(testInfo);
  }, [getUrlTestInfo]);

  return {
    // Estado
    isLoading: state.isLoading,
    result: state.result,
    error: state.error,
    
    // Acciones
    retestUrl,
    resetState,
    
    // Utilidades
    validateNewLimit,
    getUrlTestInfo,
    formatTestStatus,
  };
};

// Hook para manejar múltiples URLs que necesitan re-test
export const useUrlsNeedingRetest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [urlsNeedingRetest, setUrlsNeedingRetest] = useState<Array<{
    id: number;
    url: string;
    name: string;
    domain: string;
    last_tested_at?: string | null;
    days_since_test?: number | null;
    needs_retest: boolean;
    test_status: 'never_tested' | 'needs_retest' | 'recent' | 'unknown';
  }>>([]);

  const checkUrlsNeedingRetest = useCallback(async (urls: Array<{
    id: number;
    url: string;
    name: string;
    domain: string;
    last_tested_at?: string | null;
    max_news_limit?: number | null;
    available_news_count?: number | null;
  }>) => {
    setIsLoading(true);
    
    try {
      const needingRetest = await retestService.getUrlsNeedingRetest(urls);
      
      // Enriquecer con información adicional
      const enrichedUrls = needingRetest.map(testInfo => {
        const urlData = urls.find(u => u.id === testInfo.id);
        return {
          ...testInfo,
          url: urlData?.url || '',
          name: urlData?.name || '',
          domain: urlData?.domain || '',
        };
      });
      
      setUrlsNeedingRetest(enrichedUrls);
    } catch (error) {
      console.error('Error verificando URLs que necesitan re-test:', error);
      toast.error('Error al verificar URLs que necesitan re-test');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearList = useCallback(() => {
    setUrlsNeedingRetest([]);
  }, []);

  return {
    isLoading,
    urlsNeedingRetest,
    checkUrlsNeedingRetest,
    clearList,
  };
};

// Hook para re-test masivo
export const useBatchRetest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{
    urlId: number;
    urlName: string;
    success: boolean;
    result?: RetestResult;
    error?: string;
  }>>([]);

  const runBatchRetest = useCallback(async (
    urls: Array<{ id: number; name: string }>,
    request: RetestRequest = {},
    options: {
      delayBetweenRequests?: number;
      onProgress?: (completed: number, total: number) => void;
      onUrlComplete?: (urlId: number, result: {
        urlId: number;
        urlName: string;
        success: boolean;
        result?: RetestResult;
        error?: string;
      }) => void;
    } = {}
  ) => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const { delayBetweenRequests = 1000, onProgress, onUrlComplete } = options;

    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
          const result = await retestService.retestUrl(url.id, request);
          
          const urlResult = {
            urlId: url.id,
            urlName: url.name,
            success: true,
            result,
          };
          
          setResults(prev => [...prev, urlResult]);
          onUrlComplete?.(url.id, urlResult);
          
        } catch (error) {
          const urlResult = {
            urlId: url.id,
            urlName: url.name,
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
          
          setResults(prev => [...prev, urlResult]);
          onUrlComplete?.(url.id, urlResult);
        }

        // Actualizar progreso
        const completed = i + 1;
        setProgress((completed / urls.length) * 100);
        onProgress?.(completed, urls.length);

        // Delay entre solicitudes (excepto la última)
        if (i < urls.length - 1 && delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      toast.success(`🎉 Re-test masivo completado: ${successCount} exitosos, ${failureCount} fallidos`);
      
    } catch (error) {
      console.error('Error en re-test masivo:', error);
      toast.error('Error en el re-test masivo');
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setProgress(0);
  }, []);

  return {
    isRunning,
    progress,
    results,
    runBatchRetest,
    clearResults,
  };
};
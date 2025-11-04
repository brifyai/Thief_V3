import { useState, useCallback } from 'react';
import { simpleTestService, type SimpleTestResponse } from '@/services/simple-test.service';
import { toast } from 'react-hot-toast';

interface SimpleUrlTestState {
  url: string;
  isLoading: boolean;
  result: SimpleTestResponse | null;
  error: string | null;
}

export const useSimpleUrlTest = () => {
  const [state, setState] = useState<SimpleUrlTestState>({
    url: '',
    isLoading: false,
    result: null,
    error: null,
  });

  const setUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, url, error: null, result: null }));
  }, []);

  const testUrl = useCallback(async () => {
    if (!state.url.trim()) {
      toast.error('Por favor ingresa una URL');
      setState(prev => ({ ...prev, error: 'Por favor ingresa una URL' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));

    try {
      const result = await simpleTestService.testUrl(state.url);
      
      setState(prev => ({ ...prev, result, isLoading: false }));

      if (result.success) {
        toast.success(`✅ ${result.message || `${result.news_count} noticias encontradas`}`);
      } else {
        toast.error(result.error || 'No se encontraron noticias');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al probar la URL';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(errorMessage);
    }
  }, [state.url]);

  const testUrlWithSelectors = useCallback(async (selectors: {
    title?: string;
    content?: string;
    date?: string;
    author?: string;
    image?: string;
  }) => {
    if (!state.url.trim()) {
      toast.error('Por favor ingresa una URL');
      setState(prev => ({ ...prev, error: 'Por favor ingresa una URL' }));
      return;
    }

    if (!selectors.title || !selectors.content) {
      toast.error('Los selectores de título y contenido son requeridos');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));

    try {
      const result = await simpleTestService.testUrlWithSelectors(state.url, selectors);
      
      setState(prev => ({ ...prev, result, isLoading: false }));

      if (result.success) {
        toast.success(`✅ Selectores funcionales: ${result.news_count} noticias encontradas`);
      } else {
        toast.error(result.error || 'Los selectores no encontraron noticias');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al probar selectores';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(errorMessage);
    }
  }, [state.url]);

  const reset = useCallback(() => {
    setState({
      url: '',
      isLoading: false,
      result: null,
      error: null,
    });
  }, []);

  return {
    // Estado
    url: state.url,
    isLoading: state.isLoading,
    result: state.result,
    error: state.error,
    
    // Acciones
    setUrl,
    testUrl,
    testUrlWithSelectors,
    reset,
    
    // Utilidades
    hasResults: state.result?.success && state.result.news_count > 0,
    hasError: !!state.error,
    isSuccess: state.result?.success === true,
  };
};
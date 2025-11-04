import { useState, useCallback } from 'react';
import { scrapingService, type TestSelectorsRequest } from '@/services/scraping.service';
import { urlsService } from '@/services/urls.service';
import { toast } from 'react-hot-toast';

interface TestResult {
  available_news_count: number;
  news_preview: Array<{
    titulo: string;
    descripcion?: string;
  }>;
  success: boolean;
  used_custom_selectors?: boolean;
  scraping_method?: string;
  // Para compatibilidad con respuestas del servicio
  results?: Array<{
    title: string;
    url: string;
  }>;
  total?: number;
  error?: string;
}

interface UrlTestFlowState {
  // Estados del flujo
  step: 'initial' | 'testing' | 'success' | 'needs_config' | 'configuring' | 'ready_to_save';
  isTesting: boolean;
  
  // Resultados
  testResult: TestResult | null;
  
  // Configuración
  showAdvanced: boolean;
  customSelectors: TestSelectorsRequest;
  
  // Form data
  url: string;
  name: string;
  region: string;
  maxNewsLimit: string;
}

export const useUrlTestFlow = () => {
  const [state, setState] = useState<UrlTestFlowState>({
    step: 'initial',
    isTesting: false,
    testResult: null,
    showAdvanced: false,
    customSelectors: {
      url: '',
      titleSelector: '',
      contentSelector: '',
      dateSelector: '',
      authorSelector: '',
      imageSelector: '',
      listingContainerSelector: '',
      listingLinkSelector: '',
      listingTitleSelector: '',
    },
    url: '',
    name: '',
    region: '',
    maxNewsLimit: '',
  });

  const resetFlow = useCallback(() => {
    setState({
      step: 'initial',
      isTesting: false,
      testResult: null,
      showAdvanced: false,
      customSelectors: {
        url: '',
        titleSelector: '',
        contentSelector: '',
        dateSelector: '',
        authorSelector: '',
        imageSelector: '',
        listingContainerSelector: '',
        listingLinkSelector: '',
        listingTitleSelector: '',
      },
      url: '',
      name: '',
      region: '',
      maxNewsLimit: '',
    });
  }, []);

  const setFormData = useCallback((data: Partial<UrlTestFlowState>) => {
    setState(prev => ({ ...prev, ...data }));
  }, []);

  const setCustomSelector = useCallback((field: keyof TestSelectorsRequest, value: string) => {
    setState(prev => ({
      ...prev,
      customSelectors: {
        ...prev.customSelectors,
        [field]: value,
      }
    }));
  }, []);

  // Paso 1: Probar URL inicial (sin configuración)
  const testInitialUrl = useCallback(async () => {
    if (!state.url.trim()) {
      toast.error('Por favor ingresa una URL válida');
      return;
    }

    // Validar formato de URL
    try {
      new URL(state.url);
    } catch {
      toast.error('Por favor ingresa una URL válida (ej: https://ejemplo.com)');
      return;
    }

    setState(prev => ({ ...prev, step: 'testing', isTesting: true }));

    try {
      const serviceResult = await scrapingService.testListing({
        url: state.url,
      });

      // Convertir la respuesta del servicio al formato esperado por el hook
      const result: TestResult = {
        available_news_count: serviceResult.available_news_count || serviceResult.results?.length || 0,
        news_preview: serviceResult.news_preview || serviceResult.results?.map(item => ({
          titulo: item.title,
          descripcion: item.url
        })) || [],
        success: serviceResult.success,
        results: serviceResult.results,
        total: serviceResult.total || serviceResult.available_news_count,
        error: serviceResult.error,
        used_custom_selectors: serviceResult.used_custom_selectors,
        scraping_method: serviceResult.scraping_method
      };

      setState(prev => ({
        ...prev,
        step: 'testing',
        testResult: result,
        isTesting: false
      }));

      // Lógica clave: si hay 0 resultados, mostrar configuración
      if (result.available_news_count === 0) {
        setState(prev => ({
          ...prev,
          step: 'needs_config',
          showAdvanced: true
        }));
        
        toast('🔍 No se encontraron noticias. Intenta con selectores personalizados.', {
          icon: '⚙️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
          }
        });
      } else {
        setState(prev => ({
          ...prev,
          step: 'success'
        }));
        
        let successMessage = `✅ URL probada: ${result.available_news_count} noticias encontradas`;
        if (result.used_custom_selectors) {
          successMessage += ` (usando selectores personalizados - método: ${result.scraping_method || 'desconocido'})`;
        }
        toast.success(successMessage);
      }

    } catch (error) {
      console.error('Error en testInitialUrl:', error);
      setState(prev => ({
        ...prev,
        step: 'needs_config',
        showAdvanced: true,
        isTesting: false
      }));
      
      toast.error('Error al probar URL. Intenta con selectores personalizados.');
    }
  }, [state.url]);

  // Paso 2: Probar con selectores personalizados
  const testWithSelectors = useCallback(async () => {
    console.log('⚙️ Iniciando prueba con selectores personalizados');
    console.log('📋 Selectores configurados:', state.customSelectors);
    console.log('🌐 URL:', state.url);

    // Validación mejorada según el error del servidor
    if (!state.customSelectors.titleSelector || !state.customSelectors.contentSelector) {
      const missing = [];
      if (!state.customSelectors.titleSelector) missing.push('título');
      if (!state.customSelectors.contentSelector) missing.push('contenido');
      
      toast.error(`El servidor requiere selectores de ${missing.join(' y ')}. Por favor configura ambos selectores.`, {
        duration: 5000
      });
      return;
    }

    setState(prev => ({ ...prev, step: 'configuring', isTesting: true }));

    try {
      // Enviar datos con selectores de artículo y listado
      const serviceResult = await scrapingService.testSelectors({
        url: state.url,
        selectors: {
          titleSelector: state.customSelectors.titleSelector,
          contentSelector: state.customSelectors.contentSelector,
          dateSelector: state.customSelectors.dateSelector,
          authorSelector: state.customSelectors.authorSelector,
          imageSelector: state.customSelectors.imageSelector,
        },
        // Incluir selectores de listado si están configurados
        listingContainerSelector: state.customSelectors.listingContainerSelector,
        listingLinkSelector: state.customSelectors.listingLinkSelector,
        listingTitleSelector: state.customSelectors.listingTitleSelector,
      });

      console.log('🔍 Procesando respuesta de selectores:', serviceResult);

      // El servidor devuelve un formato diferente: { success, preview, validation, message }
      const hasTitle = serviceResult.preview?.title;
      const hasContent = serviceResult.preview?.content;
      const hasAnyContent = hasTitle || hasContent;
      
      // Mostrar información detallada de la validación
      if (serviceResult.validation) {
        console.log('📋 Detalles de validación:', serviceResult.validation);
        console.log('🔍 Preview extraído:', serviceResult.preview);
        console.log('✅ Análisis:', { hasTitle, hasContent, hasAnyContent });
      }

      // Considerar válido si tiene título (para portadas) o contenido (para artículos)
      const isValid = Boolean(hasTitle || hasContent);

      const result: TestResult = {
        available_news_count: isValid ? 1 : 0,
        news_preview: isValid ? [{
          titulo: serviceResult.preview?.title || 'Sin título',
          descripcion: serviceResult.preview?.content ?
            serviceResult.preview.content.substring(0, 100) + '...' :
            hasTitle ? 'Portada/Listado detectado' : 'Sin contenido'
        }] : [],
        success: isValid || false, // Considerar éxito si encuentra título o contenido
        results: isValid ? [{
          title: serviceResult.preview?.title || '',
          url: state.url
        }] : [],
        total: isValid ? 1 : 0,
        error: isValid ? undefined : (serviceResult.message || serviceResult.error),
        used_custom_selectors: true,
        scraping_method: 'custom_selectors'
      };

      console.log('📊 Resultado procesado para el hook:', result);

      setState(prev => ({
        ...prev,
        step: 'configuring',
        testResult: result,
        isTesting: false
      }));

      if (result.available_news_count > 0) {
        setState(prev => ({ ...prev, step: 'ready_to_save' }));
        
        // Mensaje de éxito más específico
        if (hasTitle && !hasContent) {
          toast.success(`✅ Selectores de portada funcionales: Título "${serviceResult.preview?.title}" encontrado`, {
            duration: 4000
          });
        } else if (hasTitle && hasContent) {
          toast.success(`✅ Selectores de artículo funcionales: Título y contenido encontrados`, {
            duration: 4000
          });
        } else {
          toast.success(`✅ Selectores funcionales: ${result.available_news_count} elementos encontrados`);
        }
      } else {
        // Mostrar mensaje más detallado sobre qué falló
        const validation = serviceResult.validation;
        if (validation) {
          const issues = [];
          if (!validation.hasTitle) issues.push('título');
          if (!validation.hasContent) issues.push('contenido');
          
          toast.error(`❌ Selectores no encontraron: ${issues.join(' y ')}. Intenta con otros selectores.`, {
            duration: 6000
          });
          
          // Sugerencia para ayudar al usuario
          console.log(`💡 Sugerencia: Usa F12 > Inspector para encontrar selectores válidos en ${state.url}`);
          console.log('🔧 Ejemplos comunes:', {
            título: 'h1, .title, .headline, article h1',
            contenido: '.content, .article-body, .text, article p'
          });
        } else {
          toast.error('Los selectores no encontraron noticias. Intenta con otros selectores.');
        }
      }

    } catch (error) {
      console.error('Error en testWithSelectors:', error);
      setState(prev => ({ ...prev, isTesting: false }));
      toast.error('Error al probar selectores. Verifica la configuración.');
    }
  }, [state.url, state.customSelectors]);

  // Paso 3: Guardar URL
  const saveUrl = useCallback(async () => {
    if (!state.testResult) {
      toast.error('Debes probar la URL primero');
      return;
    }

    if (!state.name.trim()) {
      toast.error('Debes ingresar un nombre descriptivo');
      return;
    }

    const maxNewsLimitNum = state.maxNewsLimit ? parseInt(state.maxNewsLimit) : null;

    // Validar límite
    if (maxNewsLimitNum && maxNewsLimitNum > state.testResult.available_news_count) {
      toast.error(
        `El límite (${maxNewsLimitNum}) no puede ser mayor que las noticias disponibles (${state.testResult.available_news_count})`
      );
      return;
    }

    try {
      const urlObj = new URL(state.url);
      const domain = urlObj.hostname.replace('www.', '');

      // Preparar custom_selectors si hay alguno definido
      const hasCustomSelectors = Object.values(state.customSelectors).some(val => val.trim() !== '');
      const selectorsToSave = hasCustomSelectors ? {
        customTitleSelector: state.customSelectors.titleSelector,
        customContentSelector: state.customSelectors.contentSelector,
        customDateSelector: state.customSelectors.dateSelector,
        customAuthorSelector: state.customSelectors.authorSelector,
        customImageSelector: state.customSelectors.imageSelector,
        listingContainerSelector: state.customSelectors.listingContainerSelector,
        listingLinkSelector: state.customSelectors.listingLinkSelector,
        listingTitleSelector: state.customSelectors.listingTitleSelector,
      } : null;

      // Usar el servicio de URLs en lugar de fetch directo
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          url: state.url,
          name: state.name,
          domain,
          region: state.region && state.region !== 'sin-region' ? state.region : null,
          custom_selectors: selectorsToSave,
          max_news_limit: maxNewsLimitNum,
          available_news_count: state.testResult.available_news_count,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar URL');
      }

      const data = await response.json();
      
      let successMessage = '✅ URL pública creada exitosamente';
      if (maxNewsLimitNum) {
        successMessage += ` (Límite: ${maxNewsLimitNum} de ${state.testResult.available_news_count} noticias)`;
      } else {
        successMessage += ` (Sin límite: se extraerán todas las ${state.testResult.available_news_count} noticias)`;
      }

      if (data.configSaved) {
        successMessage += ' con configuración personalizada';
      }

      toast.success(successMessage, { duration: 5000 });
      
      // Resetear el flujo
      resetFlow();
      
      return true;
    } catch (error: unknown) {
      console.error('Error al guardar URL:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar URL');
      return false;
    }
  }, [state, resetFlow]);

  // Utilidades
  const canSave = state.testResult && state.testResult.available_news_count > 0 && state.name.trim();
  const needsConfiguration = state.step === 'needs_config' || state.step === 'configuring';
  const hasResults = state.testResult && state.testResult.available_news_count > 0;
  const isUsingCustomSelectors = Object.values(state.customSelectors).some(val => val.trim() !== '');

  return {
    // Estado
    state,
    
    // Acciones principales
    testInitialUrl,
    testWithSelectors,
    saveUrl,
    resetFlow,
    
    // Utilidades
    setFormData,
    setCustomSelector,
    
    // Estados derivados
    canSave,
    needsConfiguration,
    hasResults,
    isUsingCustomSelectors,
    
    // Estados de flujo
    isInitial: state.step === 'initial',
    isTesting: state.isTesting,
    isSuccess: state.step === 'success',
    isReadyToSave: state.step === 'ready_to_save',
    needsConfig: state.step === 'needs_config',
    isConfiguring: state.step === 'configuring',
  };
};
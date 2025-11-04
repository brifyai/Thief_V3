'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  TestTube, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { useUrlTestFlow } from '@/hooks/useUrlTestFlow';
import { toast } from 'react-hot-toast';

const REGIONES_CHILE = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
  'Nacional',
];

export function SmartUrlTester({ onUrlSaved }: { onUrlSaved?: () => void }) {
  const {
    state,
    testInitialUrl,
    testWithSelectors,
    saveUrl,
    resetFlow,
    setFormData,
    setCustomSelector,
    canSave,
    needsConfiguration,
    hasResults,
    isUsingCustomSelectors,
    isInitial,
    isTesting,
    isSuccess,
    isReadyToSave,
    needsConfig,
    isConfiguring,
  } = useUrlTestFlow();

  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);

  const handleSave = async () => {
    const saved = await saveUrl();
    if (saved) {
      onUrlSaved?.();
    }
  };

  const showSelectorHelp = () => {
    setShowAdvancedHelp(true);
    toast(`
🎯 Guía de Selectores CSS:

BÁSICOS:
• h1 - Selecciona el primer h1
• .clase - Selecciona por clase CSS
• #id - Selecciona por ID
• article - Selecciona por etiqueta

COMBINADOS:
• article h1 - h1 dentro de article
• .post-title, h1.title - Múltiples selectores
• [class*="title"] - Atributo que contiene "title"

EJEMPLOS COMUNES:
• Título: h1, .article-title, .post-title
• Contenido: .article-body, .post-content, article .content
• Fecha: time, .date, [datetime]
• Autor: .author, .byline, [rel="author"]

💡 Tip: Usa las herramientas de desarrollador del navegador (F12) para inspeccionar elementos.
    `, { duration: 10000 });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-6 w-6 text-primary" />
          Agregar Nueva URL con Prueba Inteligente
        </CardTitle>
        <CardDescription>
          El sistema probará la URL automáticamente. Si no encuentra resultados, te ayudará a configurar selectores personalizados.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Formulario Básico */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="url">URL del Sitio *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://ejemplo.com/noticias"
              value={state.url}
              onChange={(e) => setFormData({ url: e.target.value })}
              disabled={isTesting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Descriptivo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ej: Portal de Noticias"
              value={state.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              disabled={isTesting}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="region">Región</Label>
            <Select 
              value={state.region} 
              onValueChange={(value) => setFormData({ region: value })}
              disabled={isTesting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar región (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin-region">Sin región</SelectItem>
                {REGIONES_CHILE.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botón de Prueba Principal */}
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Button
              onClick={testInitialUrl}
              disabled={!state.url || isTesting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {isTesting ? 'Probando URL...' : 'Probar URL (Obligatorio)'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {isInitial && "Debes probar la URL primero para ver cuántas noticias están disponibles"}
              {isSuccess && "✅ URL probada exitosamente. Ya puedes guardarla o configurar límites."}
              {needsConfig && "🔍 No se encontraron noticias. Configura selectores personalizados abajo."}
              {isConfiguring && "⚙️ Configura los selectores y prueba nuevamente."}
              {isReadyToSave && "🎯 Selectores configurados correctamente. Ya puedes guardar la URL."}
            </p>
          </div>

          {/* Resultados de la Prueba */}
          {state.testResult && (
            <Card className={`${hasResults ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  {hasResults ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-700">✅ URL Probada Exitosamente</h4>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-700">⚠️ Se Necesita Configuración</h4>
                    </>
                  )}
                </div>
                
                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">Noticias disponibles:</span>
                    <span className={`text-xl font-bold ${hasResults ? 'text-green-700' : 'text-yellow-700'}`}>
                      {state.testResult.available_news_count}
                    </span>
                  </div>
                  
                  {isUsingCustomSelectors && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Método:</span>
                        <Badge variant="outline">
                          🎯 Selectores personalizados
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vista previa de noticias */}
                {state.testResult.news_preview && state.testResult.news_preview.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mb-2">Vista previa (primeras noticias):</p>
                    <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
                      {state.testResult.news_preview.slice(0, 5).map((noticia, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-500 dark:text-gray-600">{index + 1}.</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-900">{noticia.titulo}</div>
                            {noticia.descripcion && (
                              <div className="text-gray-600 dark:text-gray-700 text-xs">
                                {noticia.descripcion}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Límite de noticias (solo si hay resultados) */}
          {hasResults && (
            <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Label htmlFor="maxNewsLimit" className="font-medium text-green-700 dark:text-green-300">
                📊 Límite de noticias a extraer
                <span className="text-muted-foreground ml-2">
                  (máximo {state.testResult?.available_news_count || 0})
                </span>
              </Label>
              <Input
                id="maxNewsLimit"
                type="number"
                min="1"
                max={state.testResult?.available_news_count || 0}
                placeholder={`Máximo ${state.testResult?.available_news_count || 0} noticias`}
                value={state.maxNewsLimit}
                onChange={(e) => setFormData({ maxNewsLimit: e.target.value })}
                disabled={isTesting}
                className="border-green-300 focus:border-green-500"
              />
              <p className="text-sm text-green-600">
                💡 Deja vacío para extraer todas las noticias disponibles.{' '}
                <strong>No puede ser mayor que las noticias disponibles.</strong>
              </p>
              
              {/* Información adicional sobre el test */}
              {state.testResult?.used_custom_selectors && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    ✅ Usando selectores personalizados (método: {state.testResult.scraping_method || 'desconocido'})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuración Avanzada (se muestra automáticamente si es necesario) */}
        {(needsConfiguration || state.showAdvanced) && (
          <Card className="mt-4 bg-muted/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5" />
                    ⚙️ Selectores CSS Personalizados
                  </CardTitle>
                  <CardDescription>
                    {needsConfiguration 
                      ? "💡 El scraping automático no encontró resultados. Configura selectores específicos para este sitio."
                      : "Configura selectores específicos para sitios web que requieren extracción personalizada"
                    }
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={showSelectorHelp}
                >
                  Ayuda
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <Tabs defaultValue="article" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="article">📰 Artículo Individual</TabsTrigger>
                  <TabsTrigger value="listing">📋 Listado de Noticias</TabsTrigger>
                </TabsList>

                {/* Tab: Artículo Individual */}
                <TabsContent value="article" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title-selector">
                        Título <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title-selector"
                        placeholder="h1, .article-title, .post-title"
                        value={state.customSelectors.titleSelector}
                        onChange={(e) => setCustomSelector('titleSelector', e.target.value)}
                        disabled={isTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Selector CSS para el título del artículo
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content-selector">
                        Contenido <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="content-selector"
                        placeholder=".article-body, .post-content, article .content"
                        value={state.customSelectors.contentSelector}
                        onChange={(e) => setCustomSelector('contentSelector', e.target.value)}
                        disabled={isTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Selector CSS para el contenido principal
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-selector">Fecha (opcional)</Label>
                      <Input
                        id="date-selector"
                        placeholder="time, .date, [datetime]"
                        value={state.customSelectors.dateSelector}
                        onChange={(e) => setCustomSelector('dateSelector', e.target.value)}
                        disabled={isTesting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author-selector">Autor (opcional)</Label>
                      <Input
                        id="author-selector"
                        placeholder=".author, .byline, [rel='author']"
                        value={state.customSelectors.authorSelector}
                        onChange={(e) => setCustomSelector('authorSelector', e.target.value)}
                        disabled={isTesting}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="image-selector">Imagen (opcional)</Label>
                      <Input
                        id="image-selector"
                        placeholder=".featured-image img, article img, meta[property='og:image']"
                        value={state.customSelectors.imageSelector}
                        onChange={(e) => setCustomSelector('imageSelector', e.target.value)}
                        disabled={isTesting}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Listado de Noticias */}
                <TabsContent value="listing" className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📋 Selectores de Listado</h4>
                    <p className="text-sm text-blue-700">
                      Para extraer múltiples noticias de páginas principales (ej: portadas de periódicos)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="container-selector">
                        Contenedor de Noticia <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="container-selector"
                        placeholder="article, .news-item, .card"
                        value={state.customSelectors.listingContainerSelector || ''}
                        onChange={(e) => setCustomSelector('listingContainerSelector', e.target.value)}
                        disabled={isTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Elemento que contiene cada noticia en el listado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link-selector">
                        Link de la Noticia <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="link-selector"
                        placeholder="a, h2 a, .link"
                        value={state.customSelectors.listingLinkSelector || ''}
                        onChange={(e) => setCustomSelector('listingLinkSelector', e.target.value)}
                        disabled={isTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enlace a la noticia completa (dentro del contenedor)
                      </p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="listing-title-selector">Título en Listado (opcional)</Label>
                      <Input
                        id="listing-title-selector"
                        placeholder="h2, .titulo, .headline"
                        value={state.customSelectors.listingTitleSelector || ''}
                        onChange={(e) => setCustomSelector('listingTitleSelector', e.target.value)}
                        disabled={isTesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Título de la noticia en el listado (para preview)
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Botones de acción para selectores */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    console.log('🚀 Botón de probar selectores presionado');
                    console.log('📋 Estado actual de selectores:', state.customSelectors);
                    console.log('🌐 URL a probar:', state.url);
                    
                    // Sugerencia automática según la URL
                    if (state.url.includes('latercera.com') && !state.customSelectors.listingContainerSelector) {
                      console.log('💡 Detectada portada de latercera.com. Sugiriendo selectores de listado...');
                      toast('💡 Para portadas como latercera.com, prueba los selectores de listado en la pestaña "📋 Listado de Noticias"', {
                        duration: 5000
                      });
                    }
                    
                    testWithSelectors();
                  }}
                  disabled={isTesting || !state.customSelectors.titleSelector || !state.customSelectors.contentSelector}
                  variant="outline"
                  className={(!state.customSelectors.titleSelector || !state.customSelectors.contentSelector) ? 'opacity-50' : ''}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      🧪 Probar Selectores
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    console.log('📋 Probando selectores de listado para portadas');
                    const listingSelectors = {
                      listingContainerSelector: 'article, .story-card, .news-item, [class*="story"]',
                      listingLinkSelector: 'a, h2 a, .title a, [href*="/noticias/"]',
                      listingTitleSelector: 'h2, .title, .headline'
                    };
                    
                    setFormData({
                      customSelectors: {
                        ...state.customSelectors,
                        ...listingSelectors
                      }
                    });
                    
                    toast.success('📋 Selectores de listado cargados. Úsalos para portadas de noticias.');
                  }}
                  variant="secondary"
                  size="sm"
                  disabled={isTesting}
                >
                  📋 Selectores de Portada
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setFormData({
                    customSelectors: {
                      url: '',
                      titleSelector: '',
                      contentSelector: '',
                      dateSelector: '',
                      authorSelector: '',
                      imageSelector: '',
                    }
                  })}
                  disabled={isTesting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>

                <Button
                  onClick={() => {
                    console.log('🔧 Probando selectores comunes para latercera.com');
                    const commonSelectors = {
                      titleSelector: 'h1, .headline, .article-title, .title, [class*="title"]',
                      contentSelector: '.content, .article-body, .story-content, .text, article p, [class*="content"]',
                      dateSelector: 'time, .date, .publish-date, [datetime]',
                      authorSelector: '.author, .byline, .writer, [class*="author"]'
                    };
                    
                    setFormData({
                      customSelectors: {
                        ...state.customSelectors,
                        ...commonSelectors
                      }
                    });
                    
                    toast.success('🔧 Selectores comunes cargados. Haz clic en "Probar Selectores"');
                  }}
                  variant="secondary"
                  size="sm"
                  disabled={isTesting}
                >
                  🔧 Selectores Comunes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de Guardar */}
        {canSave && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isTesting}
              className="flex-1"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Guardar URL Pública
              {state.maxNewsLimit && (
                <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded">
                  {state.maxNewsLimit} límite
                </span>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={resetFlow}
              disabled={isTesting}
            >
              Empezar de Nuevo
            </Button>
          </div>
        )}
        
        {/* Información de estado */}
        {state.testResult && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Estado del test:</span>
              <Badge variant={hasResults ? "default" : "secondary"}>
                {hasResults ? "✅ Completado" : "⚠️ Necesita configuración"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {hasResults
                ? `${state.testResult.available_news_count} noticias encontradas. Listo para guardar.`
                : "Configura selectores personalizados para extraer contenido de esta URL."
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
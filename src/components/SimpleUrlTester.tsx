'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  TestTube, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  HelpCircle,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useSimpleUrlTest } from '@/hooks/useSimpleUrlTest';
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

interface SimpleUrlTesterProps {
  onUrlSaved?: () => void;
}

export function SimpleUrlTester({ onUrlSaved }: SimpleUrlTesterProps) {
  const {
    url,
    isLoading,
    result,
    error,
    setUrl,
    testUrl,
    testUrlWithSelectors,
    reset,
    hasResults,
    hasError,
    isSuccess
  } = useSimpleUrlTest();

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [maxNewsLimit, setMaxNewsLimit] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSelectors, setCustomSelectors] = useState({
    title: '',
    content: '',
    date: '',
    author: '',
    image: ''
  });

  const handleSave = async () => {
    if (!result || !result.success) {
      toast.error('Debes probar la URL primero');
      return;
    }

    if (!name.trim()) {
      toast.error('Debes ingresar un nombre descriptivo');
      return;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      const maxNewsLimitNum = maxNewsLimit ? parseInt(maxNewsLimit) : null;

      // Validar límite
      if (maxNewsLimitNum && maxNewsLimitNum > result.news_count) {
        toast.error(
          `El límite (${maxNewsLimitNum}) no puede ser mayor que las noticias disponibles (${result.news_count})`
        );
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/public-urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          url: url,
          name: name,
          domain,
          region: region && region !== 'sin-region' ? region : null,
          max_news_limit: maxNewsLimitNum,
          available_news_count: result.news_count,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar URL');
      }

      const data = await response.json();
      
      let successMessage = '✅ URL pública creada exitosamente';
      if (maxNewsLimitNum) {
        successMessage += ` (Límite: ${maxNewsLimitNum} de ${result.news_count} noticias)`;
      } else {
        successMessage += ` (Sin límite: se extraerán todas las ${result.news_count} noticias)`;
      }

      toast.success(successMessage, { duration: 5000 });
      
      // Resetear el formulario
      reset();
      setName('');
      setRegion('');
      setMaxNewsLimit('');
      setCustomSelectors({
        title: '',
        content: '',
        date: '',
        author: '',
        image: ''
      });
      
      onUrlSaved?.();
    } catch (error: unknown) {
      console.error('Error al guardar URL:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar URL');
    }
  };

  const handleTestWithSelectors = () => {
    testUrlWithSelectors(customSelectors);
  };

  const showSelectorHelp = () => {
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

  const canSave = result && result.success && name.trim();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-6 w-6 text-primary" />
          Test Simple de URLs
        </CardTitle>
        <CardDescription>
          Usa el endpoint simple-test del backend para probar URLs rápidamente
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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Descriptivo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ej: Portal de Noticias"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="region">Región</Label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Sin región</option>
              {REGIONES_CHILE.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón de Test Principal */}
        <div className="space-y-4">
          <Button
            onClick={testUrl}
            disabled={!url || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Probando URL...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                🧪 Probar URL
              </>
            )}
          </Button>

          {/* Resultados del Test */}
          {result && (
            <Card className={`${isSuccess ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  {isSuccess ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-700">✅ URL Probada Exitosamente</h4>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-700">⚠️ No se encontraron noticias</h4>
                    </>
                  )}
                </div>
                
                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Noticias disponibles:</span>
                    <span className={`text-xl font-bold ${isSuccess ? 'text-green-700' : 'text-yellow-700'}`}>
                      {result.news_count}
                    </span>
                  </div>
                  
                  {result.method && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Método:</span>
                        <Badge variant="outline">
                          {result.method}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vista previa de noticias */}
                {result.preview && result.preview.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Vista previa (primeras noticias):</p>
                    <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
                      {result.preview.slice(0, 5).map((noticia, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground">{index + 1}.</span>
                          <div>
                            <div className="font-medium">{noticia.title}</div>
                            {noticia.excerpt && (
                              <div className="text-muted-foreground text-xs">
                                {noticia.excerpt}
                              </div>
                            )}
                            <a 
                              href={noticia.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              Ver artículo
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sugerencias si hay error */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                    <p className="font-medium text-blue-700 mb-2">💡 Sugerencias:</p>
                    <ul className="text-sm text-blue-600 space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
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
              <Label htmlFor="maxNewsLimit" className="font-medium text-green-700">
                📊 Límite de noticias a extraer
                <span className="text-muted-foreground ml-2">
                  (máximo {result?.news_count || 0})
                </span>
              </Label>
              <Input
                id="maxNewsLimit"
                type="number"
                min="1"
                max={result?.news_count || 0}
                placeholder={`Máximo ${result?.news_count || 0} noticias`}
                value={maxNewsLimit}
                onChange={(e) => setMaxNewsLimit(e.target.value)}
                disabled={isLoading}
                className="border-green-300 focus:border-green-500"
              />
              <p className="text-sm text-green-600">
                💡 Deja vacío para extraer todas las noticias disponibles.{' '}
                <strong>No puede ser mayor que las noticias disponibles.</strong>
              </p>
            </div>
          )}

          {/* Configuración Avanzada */}
          {hasError && (
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                {showAdvanced ? 'Ocultar' : 'Mostrar'} Configuración Avanzada
              </Button>

              {showAdvanced && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Settings className="h-5 w-5" />
                          ⚙️ Selectores CSS Personalizados
                        </CardTitle>
                        <CardDescription>
                          Configura selectores específicos para sitios web que requieren extracción personalizada
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={showSelectorHelp}
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Ayuda
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title-selector">
                          Título <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title-selector"
                          placeholder="h1, .article-title, .post-title"
                          value={customSelectors.title}
                          onChange={(e) => setCustomSelectors(prev => ({ ...prev, title: e.target.value }))}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content-selector">
                          Contenido <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="content-selector"
                          placeholder=".article-body, .post-content, article .content"
                          value={customSelectors.content}
                          onChange={(e) => setCustomSelectors(prev => ({ ...prev, content: e.target.value }))}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date-selector">Fecha (opcional)</Label>
                        <Input
                          id="date-selector"
                          placeholder="time, .date, [datetime]"
                          value={customSelectors.date}
                          onChange={(e) => setCustomSelectors(prev => ({ ...prev, date: e.target.value }))}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="author-selector">Autor (opcional)</Label>
                        <Input
                          id="author-selector"
                          placeholder=".author, .byline, [rel='author']"
                          value={customSelectors.author}
                          onChange={(e) => setCustomSelectors(prev => ({ ...prev, author: e.target.value }))}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={handleTestWithSelectors}
                        disabled={isLoading || !customSelectors.title || !customSelectors.content}
                        variant="outline"
                      >
                        {isLoading ? (
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
                        variant="outline"
                        onClick={() => setCustomSelectors({
                          title: '',
                          content: '',
                          date: '',
                          author: '',
                          image: ''
                        })}
                        disabled={isLoading}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Botones de Guardar */}
        {canSave && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Guardar URL Pública
              {maxNewsLimit && (
                <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded">
                  {maxNewsLimit} límite
                </span>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={reset}
              disabled={isLoading}
            >
              Empezar de Nuevo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
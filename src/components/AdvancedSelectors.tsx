'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { scrapingService, type CustomSelectors } from '@/services/scraping.service';
import { ChevronDown, ChevronRight, TestTube, Save, Trash2, HelpCircle } from 'lucide-react';

interface AdvancedSelectorsProps {
  onSelectorsChange?: (selectors: CustomSelectors) => void;
  initialSelectors?: CustomSelectors;
}

export const AdvancedSelectors: React.FC<AdvancedSelectorsProps> = ({ onSelectorsChange, initialSelectors }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectors, setSelectors] = useState<CustomSelectors>(initialSelectors || {});
  const [testUrl, setTestUrl] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectorChange = (field: keyof CustomSelectors, value: string) => {
    const newSelectors = { ...selectors, [field]: value };
    setSelectors(newSelectors);
    onSelectorsChange?.(newSelectors);
  };

  const clearSelectors = () => {
    const emptySelectors = {};
    setSelectors(emptySelectors);
    onSelectorsChange?.(emptySelectors);
    setTestResults(null);
  };

  const testSelectors = async () => {
    if (!testUrl) {
      alert('Por favor ingresa una URL para probar');
      return;
    }

    if (!selectors.titleSelector && !selectors.contentSelector) {
      alert('Por favor configura al menos un selector de título o contenido');
      return;
    }

    try {
      setIsLoading(true);
      const result = await scrapingService.testSelectors({ url: testUrl, selectors });
      setTestResults(result);
    } catch (error) {
      console.error('Error probando selectores:', error);
      alert('Error al probar los selectores');
    } finally {
      setIsLoading(false);
    }
  };

  const showSelectorHelp = () => {
    alert(`
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

💡 Tip: Usa las herramientas de desarrollador del navegador (F12) para inspeccionar elementos y encontrar los selectores correctos.
    `);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ⚙️ Selectores CSS Personalizados
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
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

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* URL de Prueba */}
          <div className="space-y-2">
            <Label htmlFor="test-url">URL de Prueba</Label>
            <div className="flex gap-2">
              <Input
                id="test-url"
                placeholder="https://ejemplo.com/articulo"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={testSelectors}
                disabled={isLoading}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isLoading ? 'Probando...' : 'Probar'}
              </Button>
            </div>
          </div>

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
                    value={selectors.titleSelector || ''}
                    onChange={(e) => handleSelectorChange('titleSelector', e.target.value)}
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
                    value={selectors.contentSelector || ''}
                    onChange={(e) => handleSelectorChange('contentSelector', e.target.value)}
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
                    value={selectors.dateSelector || ''}
                    onChange={(e) => handleSelectorChange('dateSelector', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author-selector">Autor (opcional)</Label>
                  <Input
                    id="author-selector"
                    placeholder=".author, .byline, [rel='author']"
                    value={selectors.authorSelector || ''}
                    onChange={(e) => handleSelectorChange('authorSelector', e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="image-selector">Imagen (opcional)</Label>
                  <Input
                    id="image-selector"
                    placeholder=".featured-image img, article img, meta[property='og:image']"
                    value={selectors.imageSelector || ''}
                    onChange={(e) => handleSelectorChange('imageSelector', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Listado de Noticias */}
            <TabsContent value="listing" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📋 Selectores de Listado</h4>
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
                    value={selectors.listingContainerSelector || ''}
                    onChange={(e) => handleSelectorChange('listingContainerSelector', e.target.value)}
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
                    value={selectors.listingLinkSelector || ''}
                    onChange={(e) => handleSelectorChange('listingLinkSelector', e.target.value)}
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
                    value={selectors.listingTitleSelector || ''}
                    onChange={(e) => handleSelectorChange('listingTitleSelector', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Título de la noticia en el listado (para preview)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Resultados de Prueba */}
          {testResults && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">🧪 Resultados de Prueba</CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.success ? (
                  <div className="space-y-3">
                    <Badge variant="default" className="bg-green-500">
                      ✅ Prueba Exitosa
                    </Badge>
                    
                    {testResults.extracted && (
                      <div className="space-y-2">
                        {testResults.extracted.title && (
                          <div>
                            <strong>Título:</strong>
                            <p className="text-sm bg-white p-2 rounded border">
                              {testResults.extracted.title}
                            </p>
                          </div>
                        )}
                        
                        {testResults.extracted.content && (
                          <div>
                            <strong>Contenido:</strong>
                            <p className="text-sm bg-white p-2 rounded border max-h-32 overflow-y-auto">
                              {testResults.extracted.content.substring(0, 300)}
                              {testResults.extracted.content.length > 300 && '...'}
                            </p>
                          </div>
                        )}
                        
                        {testResults.extracted.date && (
                          <div>
                            <strong>Fecha:</strong> {testResults.extracted.date}
                          </div>
                        )}
                        
                        {testResults.extracted.author && (
                          <div>
                            <strong>Autor:</strong> {testResults.extracted.author}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="destructive">
                      ❌ Error en Prueba
                    </Badge>
                    <p className="text-sm text-red-600">
                      {testResults.error || 'Error desconocido'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={clearSelectors}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            
            <div className="flex-1" />
            
            <p className="text-xs text-muted-foreground self-center">
              💡 <strong>Tip:</strong> Usa F12 en tu navegador para inspeccionar elementos
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TestResult {
  success: boolean;
  url: string;
  news_count: number;
  preview?: Array<{
    title: string;
    url: string;
    excerpt: string;
  }>;
  method?: string;
  confidence?: number;
  message?: string;
  error?: string;
  suggestions?: string[];
}

export default function TestSimplePage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testUrl = async () => {
    if (!url.trim()) {
      toast.error('Por favor ingresa una URL');
      return;
    }

    // Validar formato de URL
    try {
      new URL(url);
    } catch {
      toast.error('Por favor ingresa una URL válida (ej: https://ejemplo.com)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/simple-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        toast.success(`✅ ${data.message || `${data.news_count} noticias encontradas`}`);
      } else {
        toast.error(data.error || 'No se encontraron noticias');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al probar la URL';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setUrl('');
    setResult(null);
    setError(null);
  };

  const exampleUrls = [
    'https://www.biobiochile.cl',
    'https://www.emol.com',
    'https://www.latercera.com',
    'https://www.cooperativa.cl'
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TestTube className="h-8 w-8 text-primary" />
            Test Simple de URLs
          </h1>
          <p className="text-muted-foreground mt-2">
            Prueba el endpoint simple-test del backend directamente
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Probar URL</CardTitle>
            <CardDescription>
              Ingresa una URL para probar cuántas noticias puede extraer el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL del Sitio</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://ejemplo.com/noticias"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && testUrl()}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testUrl}
                disabled={!url || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Probar URL
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={reset}
                disabled={isLoading}
              >
                Limpiar
              </Button>
            </div>

            {/* URLs de ejemplo */}
            <div className="space-y-2">
              <Label>URLs de ejemplo:</Label>
              <div className="flex flex-wrap gap-2">
                {exampleUrls.map((exampleUrl) => (
                  <Button
                    key={exampleUrl}
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(exampleUrl)}
                    disabled={isLoading}
                  >
                    {exampleUrl.replace('https://www.', '').replace('.cl', '')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {result && (
          <Card className={`${result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    ✅ URL Probada Exitosamente
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ⚠️ No se encontraron noticias
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-sm text-muted-foreground">Noticias encontradas</div>
                  <div className={`text-2xl font-bold ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
                    {result.news_count}
                  </div>
                </div>
                
                {result.method && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Método</div>
                    <div className="text-lg font-semibold">
                      <Badge variant="outline">{result.method}</Badge>
                    </div>
                  </div>
                )}
                
                {result.confidence && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="text-sm text-muted-foreground">Confianza</div>
                    <div className="text-lg font-semibold">
                      {Math.round(result.confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>

              {result.message && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                  <p className="text-blue-700">{result.message}</p>
                </div>
              )}

              {/* Vista previa de noticias */}
              {result.preview && result.preview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Vista previa (primeras noticias):</h4>
                  <div className="space-y-2">
                    {result.preview.slice(0, 5).map((noticia, index) => (
                      <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">{index + 1}.</span>
                          <div className="flex-1">
                            <div className="font-medium">{noticia.title}</div>
                            {noticia.excerpt && (
                              <div className="text-muted-foreground text-sm mt-1">
                                {noticia.excerpt}
                              </div>
                            )}
                            <a 
                              href={noticia.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-2"
                            >
                              Ver artículo
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sugerencias si hay error */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-700 mb-2">💡 Sugerencias:</h4>
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

        {/* Error */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                ❌ Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Información técnica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Endpoint:</strong> POST /api/simple-test</div>
            <div><strong>Autenticación:</strong> Bearer Token (desde localStorage)</div>
            <div><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}</div>
            <div><strong>Token:</strong> {localStorage.getItem('token') ? '✅ Presente' : '❌ No encontrado'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
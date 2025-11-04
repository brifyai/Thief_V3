'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Search, Loader2, BookMarked, ExternalLink, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { SkeletonSearchResults } from '@/components/common/SkeletonLoader';
// import { HighlightsSection } from '@/components/highlights/HighlightsSection';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Función para determinar el color del badge según el porcentaje de relevancia
const getRelevanceColor = (percentage: number) => {
  if (percentage >= 65) {
    return {
      variant: 'default' as const,
      className: 'bg-green-500 hover:bg-green-600 text-white border-green-500'
    };
  } else if (percentage >= 35) {
    return {
      variant: 'default' as const,
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500'
    };
  } else {
    return {
      variant: 'default' as const,
      className: 'bg-red-500 hover:bg-red-600 text-white border-red-500'
    };
  }
};

interface SearchResult {
  id: number;
  title?: string;
  titulo?: string;
  summary?: string;
  cleaned_content?: string;
  url?: string;
  domain: string;
  category?: string | null;
  scraped_at: string;
  preview?: string;
  relevanceScore?: number;
  relevancePercentage?: number;
  sentiment?: string;
  sentimentScore?: number;
}

interface AIInterpretation {
  explanation: string;
  confidence?: number;
  appliedFilters?: {
    category?: string;
    region?: string;
    domain?: string;
  };
  searchTerms?: string[];
  semanticConcepts?: string[];
}

export default function AISearchPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState<AIInterpretation | null>(null);
  const [hasSearched, setHasSearched] = useState(false);



  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    
    if (!finalQuery.trim()) {
      toast.error('Por favor ingresa una consulta');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(`${API_URL}/search/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: finalQuery,
          page: 1,
          limit: 20,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.data.results || []);
        console.log('AI Interpretation from backend:', data.data.aiInterpretation);
        setAiInterpretation(data.data.aiInterpretation || null);
      } else {
        throw new Error(data.error || 'Error en la búsqueda');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al realizar la búsqueda';
      toast.error(errorMessage);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const saveArticle = async (result: SearchResult) => {
    try {
      const response = await fetch(`${API_URL}/saved-articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scraping_result_id: result.id,
          tags: result.category ? [result.category] : [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar artículo');
      }

      toast.success('Artículo guardado exitosamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar artículo';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          Búsqueda Inteligente con IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Busca en todas tus noticias guardadas usando lenguaje natural. La IA entiende tu pregunta y encuentra los artículos más relevantes.
        </p>
      </div>

      {/* Búsquedas Sugeridas */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Búsquedas Sugeridas
          </CardTitle>
          <CardDescription>
            Prueba estas consultas para explorar el contenido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'Noticias de tecnología',
              'Política internacional',
              'Economía y finanzas',
              'Deportes destacados',
              'Cultura y entretenimiento',
              'Ciencia y salud'
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
                className="hover:bg-primary hover:text-primary-foreground"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Box */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>🔍 Pregunta en Lenguaje Natural</CardTitle>
          <CardDescription>
            Escribe tu consulta como si le preguntaras a una persona
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ej: '¿Qué noticias tengo sobre tecnología?', 'Busca artículos de política'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Buscar con IA
                </>
              )}
            </Button>
          </div>


        </CardContent>
      </Card>

      {/* AI Interpretation */}
      {aiInterpretation && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Bot className="h-5 w-5" />
              La IA entendió tu búsqueda como:
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-blue-800">{aiInterpretation.explanation}</p>
            {aiInterpretation.confidence && (
              <p className="text-sm text-blue-600">
                Confianza: {Math.round(aiInterpretation.confidence * 100)}%
              </p>
            )}
            {aiInterpretation.appliedFilters && Object.keys(aiInterpretation.appliedFilters).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Filtros aplicados:</p>
                <div className="flex flex-wrap gap-2">
                  {aiInterpretation.appliedFilters.category && (
                    <Badge variant="secondary">
                      📂 {aiInterpretation.appliedFilters.category}
                    </Badge>
                  )}
                  {aiInterpretation.appliedFilters.region && (
                    <Badge variant="secondary">
                      📍 {aiInterpretation.appliedFilters.region}
                    </Badge>
                  )}
                  {aiInterpretation.appliedFilters.domain && (
                    <Badge variant="secondary">
                      🌐 {aiInterpretation.appliedFilters.domain}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {aiInterpretation.searchTerms && aiInterpretation.searchTerms.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Términos de búsqueda:</p>
                <div className="flex flex-wrap gap-2">
                  {aiInterpretation.searchTerms.map((term, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {aiInterpretation.semanticConcepts && aiInterpretation.semanticConcepts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Conceptos relacionados:</p>
                <div className="flex flex-wrap gap-2">
                  {aiInterpretation.semanticConcepts.map((concept, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
                    >
                      🧠 {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {isSearching ? 'Buscando...' : results.length > 0 ? `📊 ${results.length} Resultados` : 'Sin resultados'}
            </h2>
          </div>

          {isSearching ? (
            <SkeletonSearchResults />
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron resultados</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Intenta con una consulta diferente o verifica que tengas fuentes seleccionadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {result.titulo || result.title || 'Sin título'}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">🌐 {result.domain}</Badge>
                          {result.category && (
                            <Badge variant="secondary">{result.category}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {new Date(result.scraped_at).toLocaleDateString()}
                          </Badge>
                          {result.relevancePercentage && result.relevancePercentage > 0 && (
                            <Badge 
                              variant={getRelevanceColor(result.relevancePercentage).variant}
                              className={`text-xs ${getRelevanceColor(result.relevancePercentage).className}`}
                            >
                              🎯 {result.relevancePercentage}% relevante
                            </Badge>
                          )}
                          {result.sentiment && result.sentiment !== 'neutral' && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                result.sentiment === 'positive' ? 'border-green-500 text-green-700' :
                                result.sentiment === 'negative' ? 'border-red-500 text-red-700' :
                                ''
                              }`}
                            >
                              {result.sentiment === 'positive' ? '😊 Positivo' :
                               result.sentiment === 'negative' ? '😔 Negativo' :
                               '😐 Neutral'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(result.preview || result.summary) && (
                      <p className="text-muted-foreground line-clamp-3">
                        {result.preview || result.summary}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => router.push(`/dashboard/article/${result.id}`)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Leer Artículo Completo
                      </Button>
                      {result.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(result.url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver Original
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => saveArticle(result)}
                        className="flex items-center gap-2"
                      >
                        <BookMarked className="h-4 w-4" />
                        Guardar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

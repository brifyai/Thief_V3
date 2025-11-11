'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Eye, EyeOff, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Datos de ejemplo mientras solucionamos el problema de la API
const mockNews = [
  {
    id: 1,
    title: "Nuevos avances en inteligencia artificial revolucionan el sector tecnológico",
    content: "Investigadores han desarrollado un sistema de IA capaz de procesar información 10 veces más rápido que los modelos actuales. Este breakthrough promete transformar industrias enteras, desde la medicina hasta las finanzas, permitiendo análisis en tiempo real que antes tomaban semanas completar.",
    url: "https://ejemplo.com/noticia-1",
    source: "TechNews Daily",
    category: "tecnología",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summary: "Avance significativo en IA que promete revolucionar múltiples industrias con procesamiento ultrarrápido.",
    image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop"
  },
  {
    id: 2,
    title: "Mercado global muestra señales de recuperación económica en el tercer trimestre",
    content: "Los indicadores económicos más recientes sugieren que la economía mundial está entrando en una fase de recuperación sostenida. Los mercados de valores en Asia, Europa y América han mostrado tendencias positivas, con el S&P 500 alcanzando máximos históricos esta semana. Los analistas atribuyen este crecimiento a las políticas monetarias expansivas y al aumento del consumo.",
    url: "https://ejemplo.com/noticia-2",
    source: "Financial Times",
    category: "economía",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    summary: "Indicadores económicos globales muestran recuperación sostenida con mercados alcanzando máximos históricos.",
    image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a6296e3?w=800&h=400&fit=crop"
  },
  {
    id: 3,
    title: "Descubierta nueva especie marina en el Pacífico con capacidades bioluminiscentes",
    content: "Científicos marinos han identificado una especie previamente desconocida en las profundidades del Océano Pacífico. El organismo, bautizado como 'Luminaris pacificus', posee la capacidad de generar luz propia mediante bioluminiscencia, un fenómeno que podría tener aplicaciones médicas y tecnológicas significativas.",
    url: "https://ejemplo.com/noticia-3",
    source: "Nature Science",
    category: "ciencia",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    summary: "Nueva especie marina bioluminiscente descubierta en el Pacífico con potencial para aplicaciones médicas.",
    image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop"
  },
  {
    id: 4,
    title: "Selección nacional gana campeonato mundial en emocionante final",
    content: "En un partido que mantuvo a millones de espectadores al borde de sus asientos, la selección nacional se coronó campeona del mundo después de 120 minutos de fútbol intenso. El gol decisivo llegó en los últimos minutos del tiempo extra, desatando celebraciones masivas en todo el país. Este es el primer título mundial en 36 años de historia.",
    url: "https://ejemplo.com/noticia-4",
    source: "Sports Daily",
    category: "deportes",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    summary: "Victoria histórica en campeonato mundial tras 36 años de espera, con gol decisivo en tiempo extra.",
    image_url: "https://images.unsplash.com/photo-1431328202482-83173b27b24c?w=800&h=400&fit=crop"
  },
  {
    id: 5,
    title: "Revolución en energía solar: nuevo panel duplica la eficiencia actual",
    content: "Una empresa tecnológica ha presentado un nuevo panel solar que duplica la eficiencia de los paneles convencionales actuales. La innovación utiliza materiales perovskita de última generación y una arquitectura celular tridimensional que permite capturar más luz solar incluso en condiciones de poca iluminación. Este avance podría acelerar masivamente la transición hacia energías renovables.",
    url: "https://ejemplo.com/noticia-5",
    source: "Green Energy News",
    category: "tecnología",
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    summary: "Nuevo panel solar con el doble de eficiencia promete acelerar la transición energética renovable.",
    image_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=400&fit=crop"
  }
];

const categories = [
  { value: 'all', label: 'Todas' },
  { value: 'tecnología', label: 'Tecnología' },
  { value: 'economía', label: 'Economía' },
  { value: 'ciencia', label: 'Ciencia' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'política', label: 'Política' },
  { value: 'entretenimiento', label: 'Entretenimiento' }
];

export default function NewsPage() {
  const [news, setNews] = useState(mockNews);
  const [filteredNews, setFilteredNews] = useState(mockNews);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState<number[]>([]);

  useEffect(() => {
    // Filtrar noticias basadas en búsqueda y categoría
    let filtered = news;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredNews(filtered);
  }, [searchTerm, selectedCategory, news]);

  const toggleNewsSelection = (id: number) => {
    setSelectedNews(prev => 
      prev.includes(id) 
        ? prev.filter(newsId => newsId !== id)
        : [...prev, id]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      tecnología: 'bg-purple-100 text-purple-800',
      economía: 'bg-green-100 text-green-800',
      ciencia: 'bg-blue-100 text-blue-800',
      deportes: 'bg-orange-100 text-orange-800',
      política: 'bg-red-100 text-red-800',
      entretenimiento: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const refreshNews = () => {
    setIsLoading(true);
    // Simular carga
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">📰 Portal de Noticias</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {filteredNews.length} noticias
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNews}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar noticias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* News Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Cargando noticias...</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron noticias</h3>
            <p className="text-gray-600">Intenta ajustar los filtros o términos de búsqueda</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge className={`mb-2 ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNewsSelection(item.id)}
                      className="ml-2"
                    >
                      {selectedNews.includes(item.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="text-sm text-gray-600 line-clamp-2">
                    {item.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDistanceToNow(new Date(item.created_at), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {item.source}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      Leer artículo completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Mostrando {filteredNews.length} de {news.length} noticias
              {selectedNews.length > 0 && (
                <span className="ml-2">
                  • {selectedNews.length} seleccionada{selectedNews.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div>
              Última actualización: {new Date().toLocaleTimeString('es-ES')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Square,
  Clock,
  User,
  Globe,
  Tag,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useNews } from '../../hooks/useNews';
import { News } from '../../services/news.service';
import { formatDate } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatNumber';

interface NewsListProps {
  onNewsSelect?: (news: News) => void;
  showSelectionControls?: boolean;
  initialTab?: string;
}

const NewsList: React.FC<NewsListProps> = ({ 
  onNewsSelect, 
  showSelectionControls = true,
  initialTab = 'all'
}) => {
  const {
    news,
    loading,
    error,
    pagination,
    filters,
    stats,
    statsLoading,
    selectedNews,
    selectedLoading,
    
    fetchNews,
    toggleSelection,
    batchSelect,
    clearAllSelections,
    fetchSelectedNews,
    fetchStats,
    humanizeNews,
    exportNews,
    
    updateFilters,
    refreshNews,
    isNewsSelected,
    getSelectedCount
  } = useNews({ autoFetch: true });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('published');
  const [sortBy, setSortBy] = useState<string>('published_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedForBatch, setSelectedForBatch] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [humanizingNews, setHumanizingNews] = useState<number | null>(null);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        updateFilters({ search: searchTerm, page: 1 });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filters.search, updateFilters]);

  // Efecto para filtros
  useEffect(() => {
    const newFilters: any = {
      category: (selectedCategory && selectedCategory !== 'all') || undefined,
      domain: (selectedSource && selectedSource !== 'all') || undefined,
      status: selectedStatus,
      sortBy,
      sortOrder
    };

    if (JSON.stringify(newFilters) !== JSON.stringify({
      category: filters.category,
      domain: filters.domain,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    })) {
      updateFilters(newFilters);
    }
  }, [selectedCategory, selectedSource, selectedStatus, sortBy, sortOrder]);

  // Manejar cambio de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'selected') {
      fetchSelectedNews();
    } else {
      fetchNews();
    }
  };

  // Toggle selección individual
  const handleToggleSelection = async (newsId: number) => {
    await toggleSelection(newsId);
  };

  // Toggle selección para batch
  const handleToggleBatchSelection = (newsId: number) => {
    setSelectedForBatch(prev => 
      prev.includes(newsId) 
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    );
  };

  // Seleccionar todas visibles
  const handleSelectAllVisible = () => {
    const currentNews = activeTab === 'selected' ? selectedNews : news;
    const allIds = currentNews.map(n => n.id);
    setSelectedForBatch(allIds);
  };

  // Limpiar selección batch
  const handleClearBatchSelection = () => {
    setSelectedForBatch([]);
  };

  // Ejecutar batch selection
  const handleBatchSelect = async () => {
    if (selectedForBatch.length === 0) return;
    await batchSelect(selectedForBatch);
    setSelectedForBatch([]);
  };

  // Humanizar noticia
  const handleHumanizeNews = async (newsId: number, options: any = {}) => {
    setHumanizingNews(newsId);
    try {
      await humanizeNews(newsId, options);
    } finally {
      setHumanizingNews(null);
    }
  };

  // Exportar noticias
  const handleExport = async (format: 'json' | 'csv' | 'markdown' = 'json') => {
    await exportNews(format, false);
  };

  // Cambiar página
  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  // Renderizar tarjeta de noticia
  const renderNewsCard = (newsItem: News) => {
    const isSelected = isNewsSelected(newsItem.id);
    const isBatchSelected = selectedForBatch.includes(newsItem.id);
    const isHumanizing = humanizingNews === newsItem.id;

    return (
      <Card key={newsItem.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {showSelectionControls && (
                  <Checkbox
                    checked={isBatchSelected}
                    onCheckedChange={() => handleToggleBatchSelection(newsItem.id)}
                  />
                )}
                {showSelectionControls && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleSelection(newsItem.id)}
                    className="p-1 h-8 w-8"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {newsItem.categories?.map((cat, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    style={{ backgroundColor: cat.category.color + '20', color: cat.category.color }}
                  >
                    {cat.category.name}
                  </Badge>
                ))}
                {newsItem.priority && newsItem.priority > 1 && (
                  <Badge variant="destructive">
                    Prioridad {newsItem.priority}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg leading-tight cursor-pointer hover:text-blue-600"
                         onClick={() => onNewsSelect?.(newsItem)}>
                {newsItem.title}
              </CardTitle>
            </div>
            {newsItem.image_url && (
              <img 
                src={newsItem.image_url} 
                alt={newsItem.title}
                className="w-20 h-20 object-cover rounded-md ml-4"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {newsItem.summary && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {newsItem.summary}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>{newsItem.source}</span>
              </div>
              {newsItem.author && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{newsItem.author}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(newsItem.published_at)}</span>
              </div>
              {newsItem.reading_time && (
                <div className="flex items-center gap-1">
                  <span>{newsItem.reading_time} min</span>
                </div>
              )}
            </div>

            {newsItem.tags && newsItem.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3 w-3 text-gray-400" />
                {newsItem.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {newsItem.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{newsItem.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(newsItem.url, '_blank')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver original
                </Button>
                
                {onNewsSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNewsSelect(newsItem)}
                  >
                    Leer más
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHumanizeNews(newsItem.id)}
                  disabled={isHumanizing}
                >
                  {isHumanizing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : null}
                  Humanizar
                </Button>
              </div>

              {newsItem.humanized_content && (
                <Badge variant="secondary" className="text-xs">
                  Humanizado
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">Error: {error}</p>
          <Button onClick={refreshNews} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total noticias</p>
                  <p className="text-lg font-semibold">{formatNumber(stats.total_news)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Seleccionadas</p>
                  <p className="text-lg font-semibold">{getSelectedCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Hoy</p>
                  <p className="text-lg font-semibold">{stats.recent_activity.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Fuentes</p>
                  <p className="text-lg font-semibold">{stats.sources.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gestión de Noticias</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNews}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refrescar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
                disabled={getSelectedCount() === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar ({getSelectedCount()})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar noticias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {stats?.categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name.toLowerCase()}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {stats?.sources.map((source) => (
                    <SelectItem key={source.domain} value={source.domain}>
                      {source.domain} ({source.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publicadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="archived">Archivadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published_at">Fecha publicación</SelectItem>
                  <SelectItem value="scraped_at">Fecha scraping</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="source">Fuente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descendente</SelectItem>
                  <SelectItem value="asc">Ascendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Controles de selección */}
            {showSelectionControls && selectedForBatch.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-800">
                  {selectedForBatch.length} noticias seleccionadas
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearBatchSelection}
                  >
                    Limpiar selección
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBatchSelect}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Seleccionar todas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">
            Todas las noticias ({pagination.total})
          </TabsTrigger>
          <TabsTrigger value="selected">
            Mis seleccionadas ({getSelectedCount()})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando noticias...</p>
            </div>
          ) : news.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No se encontraron noticias</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {news.length} de {pagination.total} noticias
                </p>
                {showSelectionControls && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllVisible}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Seleccionar todas visibles
                  </Button>
                )}
              </div>
              
              {news.map(renderNewsCard)}

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="selected" className="space-y-4">
          {selectedLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando noticias seleccionadas...</p>
            </div>
          ) : selectedNews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No tienes noticias seleccionadas</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab('all')}
                >
                  Explorar noticias
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedNews.length} noticias seleccionadas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSelections}
                  disabled={loading}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Limpiar todas
                </Button>
              </div>
              
              {selectedNews.map(renderNewsCard)}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewsList;
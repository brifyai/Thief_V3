import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Interfaces actualizadas
interface News {
  id: number;
  title: string;
  content: string;
  url: string;
  source: string;
  domain: string;
  author?: string;
  published_at: string;
  scraped_at: string;
  category?: string;
  tags?: string[];
  image_url?: string;
  summary?: string;
  word_count?: number;
  reading_time?: number;
  status?: string;
  priority?: number;
  is_selected?: boolean;
  humanized_content?: string;
  humanization_date?: string;
}

interface HumanizedNews {
  id: number;
  original_news_id: number;
  title: string;
  content: string;
  humanized_content: string;
  url: string;
  source: string;
  domain: string;
  humanized_at: string;
  tone: string;
  style: string;
  complexity: string;
  readability_improvement: number;
}

const NewsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [news, setNews] = useState<News[]>([]);
  const [humanizedNews, setHumanizedNews] = useState<HumanizedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [humanizedLoading, setHumanizedLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Cargar noticias
  useEffect(() => {
    fetchNews();
    if (activeTab === 'humanized') {
      fetchHumanizedNews();
    }
  }, [activeTab]);

  // Verificar si hay ID en URL para mostrar detalle
  useEffect(() => {
    const newsId = searchParams.get('id');
    if (newsId && news.length > 0) {
      const foundNews = news.find(n => n.id === parseInt(newsId));
      if (foundNews) {
        setSelectedNews(foundNews);
        setShowDetail(true);
      }
    }
  }, [searchParams, news]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setNews(data.data.news || []);
      } else {
        // Datos de demo si no hay respuesta
        setNews(getDemoNews());
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews(getDemoNews());
    } finally {
      setLoading(false);
    }
  };

  const fetchHumanizedNews = async () => {
    try {
      setHumanizedLoading(true);
      const response = await fetch('/api/news/humanized?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setHumanizedNews(data.data || []);
      } else {
        setHumanizedNews([]);
      }
    } catch (error) {
      console.error('Error fetching humanized news:', error);
      setHumanizedNews([]);
    } finally {
      setHumanizedLoading(false);
    }
  };

  const getDemoNews = (): News[] => [
    {
      id: 1,
      title: "Economía chilena muestra signos de recuperación en tercer trimestre",
      content: "Según últimos reportes del Banco Central, la economía chilena ha mostrado indicadores positivos de recuperación durante el tercer trimestre del año...",
      url: "https://www.emol.com",
      source: "El Mercurio",
      domain: "emol.com",
      author: "Juan Pérez",
      published_at: "2025-11-05T12:00:00Z",
      scraped_at: "2025-11-05T12:30:00Z",
      category: "Economía",
      tags: ["economía", "bc", "recuperación"],
      summary: "La economía chilena muestra signos de recuperación según el Banco Central.",
      word_count: 450,
      reading_time: 2,
      status: "published",
      priority: 2,
      is_selected: false
    },
    {
      id: 2,
      title: "Nuevas tecnologías transforman el sector minero nacional",
      content: "La industria minera chilena está adoptando tecnologías de automatización e inteligencia artificial para mejorar la productividad y seguridad...",
      url: "https://www.latercera.com",
      source: "La Tercera",
      domain: "latercera.com",
      author: "María González",
      published_at: "2025-11-05T10:15:00Z",
      scraped_at: "2025-11-05T10:45:00Z",
      category: "Tecnología",
      tags: ["tecnología", "minería", "ia"],
      summary: "El sector minero chileno adopta nuevas tecnologías para mejorar procesos.",
      word_count: 380,
      reading_time: 2,
      status: "published",
      priority: 1,
      is_selected: true,
      humanized_content: "La industria minera de Chile está experimentando una transformación digital significativa...",
      humanization_date: "2025-11-05T11:00:00Z"
    },
    {
      id: 3,
      title: "Selección chilena prepara próximo partido clasificatorio",
      content: "La selección nacional de fútbol se prepara para enfrentar un partido crucial en las clasificatorias al mundial...",
      url: "https://www.biobiochile.cl",
      source: "Biobío Chile",
      domain: "biobiochile.cl",
      author: "Carlos Rodríguez",
      published_at: "2025-11-05T09:30:00Z",
      scraped_at: "2025-11-05T09:45:00Z",
      category: "Deportes",
      tags: ["fútbol", "selección", "clasificatorias"],
      summary: "La Roja se prepara para un partido decisivo en las clasificatorias.",
      word_count: 320,
      reading_time: 1,
      status: "published",
      priority: 3,
      is_selected: false
    }
  ];

  const handleNewsSelect = (newsItem: News) => {
    setSelectedNews(newsItem);
    setShowDetail(true);
    
    // Actualizar URL
    const params = new URLSearchParams();
    params.set('id', newsItem.id.toString());
    router.push(`/news?${params.toString()}`);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedNews(null);
    router.push('/news');
  };

  const handleToggleSelection = async (newsId: number) => {
    try {
      const response = await fetch(`/api/news/${newsId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selection_type: 'manual' })
      });
      
      if (response.ok) {
        // Actualizar estado local
        setNews(prev => prev.map(n =>
          n.id === newsId ? { ...n, is_selected: !n.is_selected } : n
        ));
      }
    } catch (error) {
      console.error('Error toggling selection:', error);
    }
  };

  // Humanizar noticia individual
  const handleHumanizeNews = async (newsId: number) => {
    try {
      const response = await fetch(`/api/news/${newsId}/humanize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tone: 'professional',
          style: 'detailed',
          complexity: 'intermediate'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Actualizar estado local con contenido humanizado
        setNews(prev => prev.map(n =>
          n.id === newsId ? {
            ...n,
            humanized_content: result.humanization.humanized_content,
            humanization_date: result.humanization.created_at
          } : n
        ));
        
        // Actualizar noticia seleccionada si está siendo vista
        if (selectedNews && selectedNews.id === newsId) {
          setSelectedNews(prev => prev ? {
            ...prev,
            humanized_content: result.humanization.humanized_content,
            humanization_date: result.humanization.created_at
          } : null);
        }
        
        // Actualizar lista de noticias humanizadas
        if (activeTab === 'humanized') {
          fetchHumanizedNews();
        }
      } else {
        console.error('Error humanizing news:', await response.text());
      }
    } catch (error) {
      console.error('Error humanizing news:', error);
    }
  };

  // Humanizar noticias seleccionadas en lote
  const handleBatchHumanize = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const response = await fetch('/api/news/batch-humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsIds: selectedItems,
          tone: 'professional',
          style: 'detailed',
          complexity: 'intermediate'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Batch humanization result:', result);
        setSelectedItems([]);
        
        // Refrescar listas
        if (activeTab === 'humanized') {
          fetchHumanizedNews();
        } else {
          fetchNews();
        }
      } else {
        console.error('Error in batch humanization:', await response.text());
      }
    } catch (error) {
      console.error('Error batch humanizing news:', error);
    }
  };

  // Reprocessar/Rehacer noticia
  const handleReprocessNews = async (newsId: number) => {
    try {
      const response = await fetch(`/api/news/${newsId}/reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Reprocess result:', result);
        
        // Actualizar la noticia
        if (result.updatedNews) {
          setNews(prev => prev.map(n =>
            n.id === newsId ? { ...n, ...result.updatedNews } : n
          ));
        }
      } else {
        console.error('Error reprocessing news:', await response.text());
      }
    } catch (error) {
      console.error('Error reprocessing news:', error);
    }
  };

  // Reprocessar noticias seleccionadas en lote
  const handleBatchReprocess = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const response = await fetch('/api/news/batch-reprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsIds: selectedItems,
          force: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Batch reprocess result:', result);
        setSelectedItems([]);
        fetchNews();
      } else {
        console.error('Error in batch reprocess:', await response.text());
      }
    } catch (error) {
      console.error('Error batch reprocessing news:', error);
    }
  };

  // Funciones de selección múltiple
  const handleSelectItem = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (activeTab === 'all') {
      setSelectedItems(news.map(n => n.id));
    } else if (activeTab === 'humanized') {
      setSelectedItems(humanizedNews.map(n => n.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const filteredNews = news.filter(newsItem =>
    newsItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    newsItem.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHumanizedNews = humanizedNews.filter(newsItem =>
    newsItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    newsItem.humanized_content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderHumanizedNewsList = () => (
    <div className="space-y-6">
      {humanizedLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Cargando noticias humanizadas...</p>
        </div>
      ) : filteredHumanizedNews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No hay noticias humanizadas disponibles</p>
        </div>
      ) : (
        filteredHumanizedNews.map((newsItem) => (
          <div key={newsItem.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(newsItem.id)}
                      onChange={() => handleSelectItem(newsItem.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      🧠 Humanizada
                    </span>
                    <span className="text-xs text-gray-500">
                      {newsItem.tone} • {newsItem.style} • {newsItem.complexity}
                    </span>
                  </div>
                  
                  <h2
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600 mb-2"
                    onClick={() => handleNewsSelect(newsItem as any)}
                  >
                    {newsItem.title}
                  </h2>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{newsItem.source}</span>
                    <span>•</span>
                    <span>{new Date(newsItem.humanized_at).toLocaleDateString('es-CL')}</span>
                    <span>•</span>
                    <span>Mejora: +{newsItem.readability_improvement.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="text-green-800 font-medium mb-2">Contenido Humanizado:</h4>
                <p className="text-green-700 text-sm line-clamp-3">
                  {newsItem.humanized_content.substring(0, 200)}...
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(newsItem.url, '_blank')}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                  >
                    Ver Original
                  </button>
                  
                  <button
                    onClick={() => handleNewsSelect(newsItem as any)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                  >
                    Ver Detalle
                  </button>
                  
                  <button
                    className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                  >
                    Descargar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (showDetail && selectedNews) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleCloseDetail}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Volver a noticias
          </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold mb-4">{selectedNews.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
              <span>{selectedNews.source}</span>
              <span>•</span>
              <span>{selectedNews.author}</span>
              <span>•</span>
              <span>{new Date(selectedNews.published_at).toLocaleDateString('es-CL')}</span>
              <span>•</span>
              <span>{selectedNews.reading_time} min lectura</span>
            </div>
            
            {selectedNews.summary && (
              <div className="p-4 bg-blue-50 rounded-lg mb-6">
                <p className="text-blue-800">{selectedNews.summary}</p>
              </div>
            )}
            
            <div className="prose max-w-none mb-6">
              <p className="whitespace-pre-wrap">{selectedNews.content}</p>
            </div>
            
            {selectedNews.humanized_content && (
              <div className="p-4 bg-green-50 rounded-lg mb-6">
                <h3 className="text-green-800 font-medium mb-2">Versión Humanizada</h3>
                <p className="text-green-700 whitespace-pre-wrap">{selectedNews.humanized_content}</p>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={() => window.open(selectedNews.url, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ver Original
              </button>
              
              {activeTab === 'all' && (
                <>
                  <button
                    onClick={() => handleHumanizeNews(selectedNews.id)}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    🧠 Humanizar
                  </button>
                  
                  <button
                    onClick={() => handleReprocessNews(selectedNews.id)}
                    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                  >
                    🔄 Rehacer
                  </button>
                </>
              )}
              
              <button
                onClick={() => handleToggleSelection(selectedNews.id)}
                className={`px-4 py-2 rounded ${
                  selectedNews.is_selected
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedNews.is_selected ? 'Deseleccionar' : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Gestión de Noticias
          </h1>
          <p className="text-gray-600">
            Explora, selecciona, rehace y humaniza noticias de múltiples fuentes
          </p>
        </div>

        {/* Pestañas principales */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Todas las Noticias ({news.length})
              </button>
              <button
                onClick={() => setActiveTab('humanized')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'humanized'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Noticias Humanizadas ({humanizedNews.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Controles de selección múltiple */}
        {selectedItems.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-blue-800 font-medium">
                  {selectedItems.length} elementos seleccionados
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Limpiar selección
                </button>
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Seleccionar todos
                </button>
              </div>
              <div className="flex gap-2">
                {activeTab === 'all' && (
                  <>
                    <button
                      onClick={handleBatchHumanize}
                      className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
                    >
                      🧠 Humanizar Seleccionados
                    </button>
                    <button
                      onClick={handleBatchReprocess}
                      className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700"
                    >
                      🔄 Reprocesar Seleccionados
                    </button>
                  </>
                )}
                {activeTab === 'humanized' && (
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                  >
                    📥 Descargar Seleccionados
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => activeTab === 'all' ? fetchNews() : fetchHumanizedNews()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>
          
          <div className="flex gap-2 text-sm">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {activeTab === 'all' ? 'Total' : 'Humanizadas'}: {activeTab === 'all' ? filteredNews.length : humanizedNews.length}
            </span>
            <span className="bg-green-100 px-3 py-1 rounded-full">
              Seleccionadas: {selectedItems.length}
            </span>
            {activeTab === 'all' && (
              <span className="bg-purple-100 px-3 py-1 rounded-full">
                Humanizadas: {news.filter(n => n.humanized_content).length}
              </span>
            )}
          </div>
        </div>

        {/* Lista de noticias - Renderizado condicional por pestaña */}
        {activeTab === 'all' ? (
          loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando noticias...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No se encontraron noticias</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredNews.map((newsItem) => (
                <div key={newsItem.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(newsItem.id)}
                            onChange={() => handleSelectItem(newsItem.id)}
                            className="rounded border-gray-300"
                          />
                          {newsItem.category && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {newsItem.category}
                            </span>
                          )}
                          {newsItem.priority && newsItem.priority > 1 && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Prioridad {newsItem.priority}
                            </span>
                          )}
                          {newsItem.humanized_content && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              ✅ Humanizado
                            </span>
                          )}
                        </div>
                        
                        <h2
                          className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600 mb-2"
                          onClick={() => handleNewsSelect(newsItem)}
                        >
                          {newsItem.title}
                        </h2>
                        
                        {newsItem.summary && (
                          <p className="text-gray-600 mb-3 line-clamp-2">{newsItem.summary}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{newsItem.source}</span>
                          <span>•</span>
                          <span>{newsItem.author}</span>
                          <span>•</span>
                          <span>{new Date(newsItem.published_at).toLocaleDateString('es-CL')}</span>
                          <span>•</span>
                          <span>{newsItem.reading_time} min</span>
                        </div>
                      </div>
                      
                      {newsItem.image_url && (
                        <img
                          src={newsItem.image_url}
                          alt={newsItem.title}
                          className="w-32 h-32 object-cover rounded-lg ml-4"
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(newsItem.url, '_blank')}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                        >
                          Ver Original
                        </button>
                        
                        <button
                          onClick={() => handleNewsSelect(newsItem)}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                        >
                          Leer Más
                        </button>
                        
                        <button
                          onClick={() => handleHumanizeNews(newsItem.id)}
                          className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm hover:bg-purple-200"
                        >
                          🧠 Humanizar
                        </button>
                        
                        <button
                          onClick={() => handleReprocessNews(newsItem.id)}
                          className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm hover:bg-orange-200"
                        >
                          🔄 Rehacer
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSelection(newsItem.id)}
                          className={`px-3 py-1 rounded text-sm ${
                            newsItem.is_selected
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {newsItem.is_selected ? 'Deseleccionar' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          renderHumanizedNewsList()
        )}
      </div>
    </div>
  );
};

export default NewsPage;
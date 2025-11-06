'use client';

import { useState } from 'react';
import NewsList from '@/components/news/NewsList';
import { News } from '@/services/news.service';

export default function NewsPage() {
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleNewsSelect = (news: News) => {
    setSelectedNews(news);
    setShowDetail(true);
    
    // Actualizar URL
    const params = new URLSearchParams();
    params.set('id', news.id.toString());
    window.history.pushState(null, '', `/news?${params.toString()}`);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedNews(null);
    window.history.pushState(null, '', '/news');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧠 Sistema de Gestión de Noticias
          </h1>
          <p className="text-gray-600">
            Explora, selecciona, humaniza y reprocessar noticias de múltiples fuentes
          </p>
        </div>

        {/* Página de detalles */}
        {showDetail && selectedNews && (
          <NewsDetail 
            news={selectedNews} 
            onClose={handleCloseDetail}
            onBack={handleCloseDetail}
          />
        )}

        {/* Lista de noticias */}
        {!showDetail && (
          <NewsList 
            onNewsSelect={handleNewsSelect}
            showSelectionControls={true}
            initialTab="all"
          />
        )}
      </div>
    </div>
  );
}

// Import del componente de detalle
import NewsDetail from '@/components/news/NewsDetail';
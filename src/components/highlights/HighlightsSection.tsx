'use client';

import { useRouter } from 'next/navigation';
import { useHighlights } from '@/hooks/useHighlights';
import { HighlightCard } from './HighlightCard';
import HighlightsSkeleton from './HighlightSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp } from 'lucide-react';
import { HighlightSection } from '@/types/highlights';

export function HighlightsSection() {
  const router = useRouter();
  const { data: highlightsData, isLoading, error, isError } = useHighlights();

  // Manejar click en un artículo
  const handleArticleClick = (articleId: number) => {
    router.push(`/dashboard/article/${articleId}`);
  };

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return <HighlightsSkeleton />;
  }

  // Si hay error, mostrar mensaje de error (no crítico)
  if (isError) {
    console.error('Error loading highlights:', error);
    // No mostrar error al usuario, simplemente no mostrar la sección
    return null;
  }

  // Si no hay datos o no hay contenido, no mostrar nada
  if (!highlightsData || !highlightsData.hasContent || highlightsData.sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-12">
      {/* Título principal con badge */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-7 w-7 text-yellow-500" />
          <h2 className="text-3xl font-bold tracking-tight">
            Noticias Destacadas
          </h2>
          <Sparkles className="h-7 w-7 text-yellow-500" />
        </div>
        <p className="text-muted-foreground">
          Las noticias más relevantes de tus fuentes seleccionadas
        </p>
      </div>

      {/* Secciones */}
      <div className="space-y-6">
        {highlightsData.sections.map((section: HighlightSection) => (
          <SectionComponent
            key={section.id}
            section={section}
            onArticleClick={handleArticleClick}
          />
        ))}
      </div>
    </div>
  );
}

interface SectionComponentProps {
  section: HighlightSection;
  onArticleClick: (articleId: number) => void;
}

function SectionComponent({ section, onArticleClick }: SectionComponentProps) {
  // Limitar a 6 noticias por sección para mejor UX
  const limitedNews = section.news.slice(0, 6);

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: section.color }}>
      {/* Header de la sección */}
      <CardHeader 
        className="pb-4"
        style={{
          background: `linear-gradient(135deg, ${section.color}10 0%, ${section.color}05 100%)`
        }}
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">{section.icon}</div>
          <div className="flex-1">
            <CardTitle 
              className="text-2xl mb-1"
              style={{ color: section.color }}
            >
              {section.title}
            </CardTitle>
            <CardDescription className="text-base">
              {section.subtitle}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {section.news.length} {section.news.length === 1 ? 'noticia' : 'noticias'}
          </Badge>
        </div>
      </CardHeader>

      {/* Grid de noticias */}
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {limitedNews.map((article) => (
            <HighlightCard
              key={article.id}
              article={article}
              sectionColor={section.color}
              onClick={onArticleClick}
            />
          ))}
        </div>
        
        {/* Mostrar mensaje si hay más noticias */}
        {section.news.length > 6 && (
          <div className="text-center mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Y {section.news.length - 6} {section.news.length - 6 === 1 ? 'noticia' : 'noticias'} más en esta sección
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
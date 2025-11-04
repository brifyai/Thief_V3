'use client';

import { NewsArticle } from '@/types/highlights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Globe, ArrowRight } from 'lucide-react';

interface HighlightCardProps {
  article: NewsArticle;
  sectionColor: string;
  onClick: (articleId: number) => void;
}

export function HighlightCard({ article, sectionColor, onClick }: HighlightCardProps) {
  const handleClick = () => {
    onClick(article.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group border-l-4"
      style={{ borderLeftColor: sectionColor }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          {article.category && (
            <Badge 
              variant="secondary"
              className="text-xs font-semibold"
              style={{
                backgroundColor: `${sectionColor}15`,
                color: sectionColor,
                borderColor: `${sectionColor}30`
              }}
            >
              {article.category}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(article.scraped_at)}
          </div>
        </div>
        
        <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {article.summary && (
          <CardDescription className="text-sm line-clamp-2">
            {article.summary}
          </CardDescription>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{article.domain}</span>
          </div>
          <div 
            className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
            style={{ color: sectionColor }}
          >
            Leer
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
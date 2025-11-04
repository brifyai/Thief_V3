'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Globe, Quote, FileText, Brain, Lightbulb, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SentimentBadge from './SentimentBadge';
import type { EntityMention } from '@/types/entities';

interface MentionCardProps {
  mention: EntityMention;
}

export default function MentionCard({ mention }: MentionCardProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewArticle = () => {
    if (mention.scraping_result_id) {
      router.push(`/dashboard/article/${mention.scraping_result_id}`);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (confidence >= 0.5) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 hover:border-l-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-3">
              {mention.scraping_result?.title || 'Sin título'}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <SentimentBadge 
                sentiment={mention.sentiment} 
                score={mention.sentiment_score}
                size="sm"
              />
              <Badge variant="outline" className={`text-xs font-medium ${getConfidenceColor(mention.sentiment_confidence)}`}>
                {(mention.sentiment_confidence * 100).toFixed(0)}% confianza
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Context - Mejorado */}
        <div className="relative bg-muted/50 rounded-lg p-4 border-l-2 border-primary">
          <Quote className="absolute top-2 left-2 w-4 h-4 text-primary/40" />
          <p className="text-sm text-foreground/80 line-clamp-3 pl-6 italic">
            {mention.context}
          </p>
        </div>

        {/* Keywords & Topics - Modernizado */}
        {(mention.keywords.length > 0 || mention.topics.length > 0) && (
          <div className="space-y-3">
            {mention.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Palabras clave</p>
                <div className="flex flex-wrap gap-2">
                  {mention.keywords.slice(0, 5).map((keyword, index) => (
                    <Badge key={index} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {mention.topics.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Temas</p>
                <div className="flex flex-wrap gap-2">
                  {mention.topics.slice(0, 3).map((topic, index) => (
                    <Badge key={index} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tone - Modernizado */}
        {mention.tone && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
              Tono: {mention.tone}
            </Badge>
          </div>
        )}

        {/* Campos V2 - Nuevos */}
        {(mention.reason || mention.summary || mention.analysis_method) && (
          <div className="space-y-3 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Análisis V2</span>
            </div>
            
            {mention.reason && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-muted-foreground">Razón de detección</span>
                </div>
                <p className="text-sm text-foreground/80 pl-5">{mention.reason}</p>
              </div>
            )}
            
            {mention.summary && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">Resumen</span>
                </div>
                <p className="text-sm text-foreground/80 pl-5">{mention.summary}</p>
              </div>
            )}
            
            {mention.analysis_method && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">Método de análisis</span>
                </div>
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200 ml-5">
                  {mention.analysis_method}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Metadata - Modernizado */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-primary/60" />
              <span className="font-medium">{mention.scraping_result?.domain}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary/60" />
              <span>{formatDate(mention.analyzed_at)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón para ver artículo interno */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs gap-1.5" 
              onClick={handleViewArticle}
            >
              <FileText className="w-3.5 h-3.5" />
              Ver Análisis
            </Button>
            
            {/* Botón para ver noticia externa */}
            {mention.scraping_result && (
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90" 
                asChild
              >
                <a 
                  href={mention.scraping_result.saved_urls?.url || mention.scraping_result.public_url?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Leer Original
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

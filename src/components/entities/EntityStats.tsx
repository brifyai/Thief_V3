'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, MessageSquare, Hash, Globe } from 'lucide-react';
import { useEntityStats } from '@/hooks/useEntities';
import SentimentBadge from './SentimentBadge';

interface EntityStatsProps {
  entityId: string;
}

export default function EntityStats({ entityId }: EntityStatsProps) {
  const { stats, isLoading, error } = useEntityStats(entityId);

  // DEBUG: Ver qué stats está recibiendo
  console.log('📊 EntityStats DEBUG:', {
    entityId,
    stats,
    isLoading,
    error
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.2) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (sentiment < -0.2) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return 'text-green-600';
    if (sentiment < -0.2) return 'text-red-600';
    return 'text-gray-600';
  };

  const totalSentiments = 
    (stats.sentiment_distribution?.positive || 0) +
    (stats.sentiment_distribution?.negative || 0) +
    (stats.sentiment_distribution?.neutral || 0) +
    (stats.sentiment_distribution?.mixed || 0);

  // Calcular sentimiento promedio basado en la distribución
  const averageSentiment = totalSentiments > 0 ? 
    ((stats.sentiment_distribution?.positive || 0) - (stats.sentiment_distribution?.negative || 0)) / totalSentiments : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Menciones */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Total Menciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_mentions || 0}</div>
          </CardContent>
        </Card>

        {/* Sentimiento Promedio */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              {getSentimentIcon(averageSentiment)}
              Sentimiento Promedio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getSentimentColor(averageSentiment)}`}>
              {averageSentiment > 0 ? '+' : ''}
              {averageSentiment.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        {/* Fuentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Fuentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.top_sources?.length || 0}</div>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.top_keywords?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de Sentimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Sentimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sentiment Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-green-500 transition-all duration-300"
                  style={{ 
                    width: `${totalSentiments > 0 ? ((stats.sentiment_distribution?.positive || 0) / totalSentiments) * 100 : 0}%` 
                  }}
                />
                <div 
                  className="bg-gray-400 transition-all duration-300"
                  style={{ 
                    width: `${totalSentiments > 0 ? ((stats.sentiment_distribution?.neutral || 0) / totalSentiments) * 100 : 0}%` 
                  }}
                />
                <div 
                  className="bg-red-500 transition-all duration-300"
                  style={{ 
                    width: `${totalSentiments > 0 ? ((stats.sentiment_distribution?.negative || 0) / totalSentiments) * 100 : 0}%` 
                  }}
                />
                <div 
                  className="bg-yellow-500 transition-all duration-300"
                  style={{ 
                    width: `${totalSentiments > 0 ? ((stats.sentiment_distribution?.mixed || 0) / totalSentiments) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Positivo ({stats.sentiment_distribution?.positive || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded" />
                <span>Neutral ({stats.sentiment_distribution?.neutral || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>Negativo ({stats.sentiment_distribution?.negative || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>Mixto ({stats.sentiment_distribution?.mixed || 0})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Sources y Keywords */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Top Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_sources?.slice(0, 5).map((source, index) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{source.source}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{source.count}</span>
                </div>
              )) || (
                <div className="text-sm text-muted-foreground">No hay datos disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.top_keywords?.slice(0, 10).map((keyword, index) => (
                <Badge key={keyword.keyword} variant="secondary" className="text-xs">
                  {keyword.keyword} ({keyword.count})
                </Badge>
              )) || (
                <div className="text-sm text-muted-foreground">No hay datos disponibles</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

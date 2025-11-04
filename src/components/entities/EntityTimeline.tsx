'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import type { EntityTimeline } from '@/types/entities';

interface EntityTimelineProps {
  timeline: EntityTimeline[];
  isLoading?: boolean;
  onDaysChange?: (days: number) => void;
  selectedDays?: number;
}

export default function EntityTimelineComponent({ 
  timeline, 
  isLoading = false, 
  onDaysChange,
  selectedDays = 30 
}: EntityTimelineProps) {
  const getSentimentIcon = (avgSentiment: number) => {
    if (avgSentiment > 0.2) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (avgSentiment < -0.2) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getSentimentColor = (avgSentiment: number) => {
    if (avgSentiment > 0.2) return 'text-green-600';
    if (avgSentiment < -0.2) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentScore = (avgSentiment: number) => {
    return Math.round((avgSentiment + 1) * 50);
  };

  const getMaxMentions = () => {
    if (!timeline.length) return 1;
    return Math.max(...timeline.map(day => day.mentions));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline de Menciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline de Menciones
          </CardTitle>
          <CardDescription>
            Evolución de menciones a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay datos de timeline disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline de Menciones
          </span>
          {onDaysChange && (
            <Select
              value={selectedDays.toString()}
              onValueChange={(value) => onDaysChange(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardTitle>
        <CardDescription>
          Evolución de menciones y sentimiento a lo largo del tiempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Resumen estadístico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {timeline.reduce((sum, day) => sum + day.mentions, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Menciones</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(timeline.reduce((sum, day) => sum + day.mentions, 0) / timeline.length)}
              </div>
              <div className="text-sm text-muted-foreground">Promedio Diario</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${getSentimentColor(
                timeline.reduce((sum, day) => sum + day.avgSentiment, 0) / timeline.length
              )}`}>
                {getSentimentScore(
                  timeline.reduce((sum, day) => sum + day.avgSentiment, 0) / timeline.length
                )}%
              </div>
              <div className="text-sm text-muted-foreground">Sentimiento Promedio</div>
            </div>
          </div>

          {/* Timeline visual */}
          <div className="space-y-3">
            {timeline.map((day, index) => {
              const maxMentions = getMaxMentions();
              const percentage = (day.mentions / maxMentions) * 100;
              
              return (
                <div key={day.date} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Fecha */}
                  <div className="text-sm font-medium min-w-24">
                    {new Date(day.date).toLocaleDateString('es', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                  
                  {/* Barra de menciones */}
                  <div className="flex-1 relative">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="bg-blue-600 h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 20 && (
                            <span className="text-xs text-white font-medium">
                              {day.mentions}
                            </span>
                          )}
                        </div>
                      </div>
                      {percentage <= 20 && (
                        <span className="text-sm font-medium min-w-8 text-right">
                          {day.mentions}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Sentimiento */}
                  <div className="flex items-center gap-2 min-w-24">
                    {getSentimentIcon(day.avgSentiment)}
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getSentimentColor(day.avgSentiment)}`}>
                        {getSentimentScore(day.avgSentiment)}%
                      </div>
                      <div className="flex gap-1 justify-end">
                        {day.sentimentDistribution.POSITIVE > 0 && (
                          <Badge variant="default" className="text-xs px-1 py-0">
                            +{day.sentimentDistribution.POSITIVE}
                          </Badge>
                        )}
                        {day.sentimentDistribution.NEGATIVE > 0 && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            -{day.sentimentDistribution.NEGATIVE}
                          </Badge>
                        )}
                        {day.sentimentDistribution.NEUTRAL > 0 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {day.sentimentDistribution.NEUTRAL}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Número de menciones</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Sentimiento positivo</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span>Sentimiento negativo</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-600" />
                <span>Sentimiento neutral</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
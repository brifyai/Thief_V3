'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Loader2, MessageSquare } from 'lucide-react';
import { useEntityMentions } from '@/hooks/useEntityMentions';
import MentionCard from './MentionCard';
import type { SentimentType } from '@/types/entities';

interface MentionsListProps {
  entityId: string;
}

export default function MentionsList({ entityId }: MentionsListProps) {
  const [sentimentFilter, setSentimentFilter] = useState<SentimentType | 'ALL'>('ALL');
  const [limit] = useState(20);
  const [page, setPage] = useState(1);

  const offset = (page - 1) * limit;

  const { mentions, pagination, isLoading, error, refetch } = useEntityMentions(entityId, {
    sentiment: sentimentFilter === 'ALL' ? undefined : sentimentFilter,
    limit,
    offset
  });

  // DEBUG: Ver qué está recibiendo el componente
  console.log('🔍 MentionsList DEBUG:', {
    entityId,
    sentimentFilter,
    mentions,
    mentionsLength: mentions?.length,
    pagination,
    isLoading,
    error
  });

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;

  const handleFilterChange = (value: string) => {
    setSentimentFilter(value as SentimentType | 'ALL');
    setPage(1); // Reset to first page
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (isLoading && mentions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-4">Error al cargar menciones</p>
          <Button onClick={() => refetch()} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menciones</CardTitle>
              <CardDescription>
                {pagination?.total || 0} menciones encontradas
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <Select value={sentimentFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por sentimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="POSITIVE">Positivos</SelectItem>
                  <SelectItem value="NEGATIVE">Negativos</SelectItem>
                  <SelectItem value="NEUTRAL">Neutrales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de menciones */}
      {mentions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin menciones</h3>
            <p className="text-sm text-muted-foreground text-center">
              No se encontraron menciones con los filtros seleccionados
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {mentions.map((mention) => (
              <MentionCard key={mention.id} mention={mention} />
            ))}
          </div>

          {/* Paginación */}
          {pagination && totalPages > 1 && (
            <Card className="mt-6">
              <CardContent className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {mentions.length} de {pagination.total} menciones
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1 || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    ← Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    Siguiente →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

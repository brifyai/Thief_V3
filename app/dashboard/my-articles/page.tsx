'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { BookMarked, Loader2, Eye, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface SavedArticle {
  id: number;
  scraping_result_id: number;
  is_read: boolean;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  scraped_at: string;
  user_id: number;
  original_deleted: boolean;
  // Datos directos del scraping_result (estructura plana)
  title: string;
  summary: string;
  content: string;
  url: string;
  domain: string;
  category: string | null;
}

export default function MyArticlesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<number | null>(null);
  const [filterRead, setFilterRead] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [articles, filterRead, filterTag]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/saved-articles?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar artículos');

      const data = await response.json();
      const articlesData = data.data || [];
      setArticles(articlesData);

      // Extraer tags únicos
      const tags = new Set<string>();
      articlesData.forEach((article: SavedArticle) => {
        article.tags.forEach((tag) => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar artículos');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...articles];

    if (filterRead !== 'all') {
      const isRead = filterRead === 'read';
      filtered = filtered.filter((article) => article.is_read === isRead);
    }

    if (filterTag !== 'all') {
      filtered = filtered.filter((article) => article.tags.includes(filterTag));
    }

    setFilteredArticles(filtered);
  };

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/saved-articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_read: true }),
      });

      if (!response.ok) throw new Error('Error al marcar como leído');

      await loadArticles();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmDelete = (id: number) => {
    setArticleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteArticle = async () => {
    if (!articleToDelete) return;

    try {
      const response = await fetch(`${API_URL}/saved-articles/${articleToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al eliminar artículo');

      toast.success('Artículo eliminado exitosamente');
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
      await loadArticles();
    } catch (error: any) {
      toast.error(error.message);
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const openArticle = (article: SavedArticle) => {
    // Marcar como leído si no lo está
    if (!article.is_read) {
      markAsRead(article.id);
    }
    // Navegar a la página de detalle del artículo
    router.push(`/dashboard/article/${article.scraping_result_id}`);
  };

  const stats = {
    total: articles.length,
    unread: articles.filter((a) => !a.is_read).length,
    read: articles.filter((a) => a.is_read).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando artículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookMarked className="h-8 w-8 text-primary" />
          Mis Artículos Guardados
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y lee tus artículos guardados
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Guardados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sin Leer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Leídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.read}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unread">Sin leer</SelectItem>
                  <SelectItem value="read">Leídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay artículos guardados</h3>
            <p className="text-sm text-muted-foreground text-center">
              Guarda artículos desde la búsqueda con IA para verlos aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              className={`hover:shadow-md transition-shadow ${
                !article.is_read ? 'border-blue-500 border-2' : ''
              }`}
            >
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {article.title || 'Sin título'}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{article.domain || 'Sin dominio'}</Badge>
                    {article.category && (
                      <Badge variant="secondary">{article.category}</Badge>
                    )}
                    {!article.is_read && <Badge variant="default">📌 Nuevo</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {article.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.summary}
                  </p>
                )}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openArticle(article)}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Leer
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmDelete(article.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El artículo será eliminado de tus guardados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArticleToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteArticle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

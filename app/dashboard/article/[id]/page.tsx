'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ExternalLink,
  BookMarked,
  Share2,
  Calendar,
  Globe,
  Tag,
  User,
  Loader2,
  Eye,
  Moon,
  Sun,
  Minus,
  Plus,
  Brain,
  Clock,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { articleService, type ArticleDetail } from '@/services/article.service';
import { useThemeMode } from '@/components/theme/ThemeToggle';
import toast from 'react-hot-toast';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const { isDark, setTheme } = useThemeMode();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const articleId = params.id as string;

  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  const loadArticle = async () => {
    setIsLoading(true);
    try {
      const articleData = await articleService.getArticleById(articleId);
      
      setArticle(articleData);
      
      // Verificar si el artículo está guardado
      await checkIfArticleIsSaved(articleData);
      
      toast.success('Artículo cargado exitosamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar el artículo';
      console.error('💥 Error completo al cargar artículo:', error);
      
      // Mensaje más descriptivo para el usuario
      const userMessage = errorMessage.includes('404')
        ? 'No se encontró el artículo solicitado. Es posible que haya sido eliminado o el ID no sea válido.'
        : errorMessage.includes('HTTP error')
        ? 'Error de conexión al servidor. Por favor, intenta nuevamente más tarde.'
        : 'No se pudo cargar el artículo. Por favor, intenta nuevamente.';
      
      toast.error(userMessage, {
        duration: 5000,
      });
      
      // Redirigir después de un delay para que el usuario pueda ver el error
      setTimeout(() => {
        router.push('/dashboard/ai-search');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfArticleIsSaved = async (articleData: ArticleDetail) => {
    try {
      // Obtener la lista de artículos guardados del usuario
      const savedArticlesResponse = await articleService.getSavedArticles(1, 100);
      const savedArticles = savedArticlesResponse.articles;
      
      // Buscar si este artículo está en la lista de guardados
      // Comparar por scraping_result_id
      const scrapingId = articleData.id || articleId;
      const isArticleSaved = savedArticles.some(savedArticle => 
        savedArticle.scraping_result_id.toString() === scrapingId.toString()
      );
      
      // Actualizar el estado del artículo
      if (isArticleSaved) {
        setArticle(prev => prev ? { ...prev, is_saved: true } : prev);
      } else {
        setArticle(prev => prev ? { ...prev, is_saved: false } : prev);
      }
      
    } catch (error) {
      console.error('💥 Error al verificar si el artículo está guardado:', error);
      // En caso de error, asumir que no está guardado
      setArticle(prev => prev ? { ...prev, is_saved: false } : prev);
    }
  };

  const saveArticle = async () => {
    if (!article) {
      toast.error('No hay artículo cargado para guardar');
      return;
    }

    // Verificar si el artículo ya está guardado
    if (article.is_saved) {
      toast('Este artículo ya está guardado');
      return;
    }

    setIsSaving(true);
    try {
      // Usar el ID del artículo o el ID de la URL
      let scrapingId = article.id || articleId;
      
      if (!scrapingId) {
        console.error('❌ No se encontró ID en ninguna propiedad del artículo ni en la URL');
        toast.error('Error: No se puede identificar el artículo. Intenta recargar la página.');
        return;
      }

      // Validar y convertir scraping_result_id a número
      const scrapingResultId = Number(scrapingId);
      
      if (isNaN(scrapingResultId)) {
        console.error('❌ ID no es un número válido:', scrapingId);
        toast.error('Error: ID de artículo inválido. Intenta en otro momento.');
        return;
      }

      // Preparar los datos en el formato correcto
      const saveData = {
        scraping_result_id: scrapingResultId,
        notes: '',
        tags: article.category ? [article.category] : []
      };
      
      await articleService.saveArticle(saveData);
      toast.success('¡Artículo guardado exitosamente!');
      setArticle({ ...article, is_saved: true });
    } catch (error: unknown) {
      console.error('💥 Error completo al guardar artículo:', error);
      
      // Manejo de errores más amigable
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          toast.error('Error del servidor. Verifica que el artículo existe e intenta en otro momento.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error('Error de autenticación. Por favor, inicia sesión nuevamente.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error('Error de conexión. Verifica tu internet e intenta nuevamente.');
        } else {
          toast.error('Error al guardar el artículo. Intenta en otro momento.');
        }
      } else {
        toast.error('Error inesperado. Intenta en otro momento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const unsaveArticle = async () => {
    if (!article) {
      toast.error('No hay artículo cargado');
      return;
    }

    if (!article.is_saved) {
      toast('Este artículo no está guardado');
      return;
    }

    setIsSaving(true);
    try {
      // Usar el ID del artículo o el ID de la URL
      let scrapingId = article.id || articleId;
      
      if (!scrapingId) {
        console.error('❌ No se encontró ID en ninguna propiedad del artículo ni en la URL');
        toast.error('Error: No se puede identificar el artículo. Intenta recargar la página.');
        return;
      }

      // Validar y convertir scraping_result_id a número
      const scrapingResultId = Number(scrapingId);
      
      if (isNaN(scrapingResultId)) {
        console.error('❌ ID no es un número válido:', scrapingId);
        toast.error('Error: ID de artículo inválido. Intenta en otro momento.');
        return;
      }

      await articleService.unsaveArticle(scrapingResultId);
      toast.success('¡Artículo eliminado de guardados exitosamente!');
      setArticle({ ...article, is_saved: false });
    } catch (error: unknown) {
      console.error('💥 Error completo al eliminar artículo de guardados:', error);
      
      // Manejo de errores más amigable
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          toast.error('El artículo no se encontró en tus guardados.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error('Error de autenticación. Por favor, inicia sesión nuevamente.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error('Error de conexión. Verifica tu internet e intenta nuevamente.');
        } else {
          toast.error('Error al eliminar el artículo de guardados. Intenta en otro momento.');
        }
      } else {
        toast.error('Error inesperado. Intenta en otro momento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const shareArticle = async () => {
    if (!article) return;

    const shareData = articleService.prepareShareData(article);

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Artículo compartido exitosamente');
      } catch (error) {
        // Error silencioso para compartir cancelado
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast.success('Enlace copiado al portapapeles');
      } catch (error) {
        toast.error('Error al copiar el enlace');
      }
    }
  };

  const generateAISummary = async () => {
    if (!article) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await articleService.generateAISummary(
        article.cleaned_content || article.content || article.contenido || '',
        article.titulo || article.title || ''
      );
      setAiSummary(summary);
      toast.success('Resumen generado exitosamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al generar resumen';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const toggleDarkMode = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando artículo...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No se encontró el artículo</p>
          <Button onClick={() => router.push('/dashboard/ai-search')}>
            Volver a la búsqueda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex-1" />
        <div className="flex gap-2">
          {article.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(article.url, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Original
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={shareArticle}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </Button>
          {!article.is_saved && (
            <Button
              variant="default"
              size="sm"
              onClick={saveArticle}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookMarked className="h-4 w-4" />
              )}
              Guardar
            </Button>
          )}
        </div>
      </div>

      {/* Reading Controls */}
      <Card className="bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 transition-colors duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Controles de lectura:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="flex items-center gap-2"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={decreaseFontSize}
                className="flex items-center gap-2"
              >
                <Minus className="h-4 w-4" />
                Disminuir
              </Button>
              <span className="text-sm font-medium px-2">{fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={increaseFontSize}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Aumentar
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAISummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-2"
            >
              {isGeneratingSummary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {aiSummary ? 'Regenerar Resumen IA' : 'Generar Resumen IA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Article Content */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* Title */}
            <CardTitle className="text-3xl font-bold leading-tight">
              {article.titulo || article.title || 'Sin título'}
            </CardTitle>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {article.domain}
              </Badge>
              {article.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {article.category}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {articleService.formatDate(article.scraped_at)}
              </Badge>
              {article.autor && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {article.autor}
                </Badge>
              )}
              {article.relevancePercentage && article.relevancePercentage > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.relevancePercentage}% relevante
                </Badge>
              )}
              {article.sentiment && (
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-1 ${articleService.getSentimentColor(article.sentiment)}`}
                >
                  <span>{articleService.getSentimentIcon(article.sentiment)}</span>
                  {articleService.getSentimentLabel(article.sentiment)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className={`space-y-6 pt-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-white'}`}>
          {/* AI Summary */}
          {aiSummary && (
            <div className={`space-y-2 p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Resumen Generado por IA
              </h3>
              <p className={`leading-relaxed ${isDark ? 'text-blue-100' : 'text-blue-800'}`}>
                {aiSummary}
              </p>
            </div>
          )}

          {/* Original Summary */}
          {(article.summary || article.preview) && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Resumen Original</h3>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>
                {article.summary || article.preview}
              </p>
            </div>
          )}

          <Separator className={isDark ? 'border-gray-700' : ''} />

          {/* Full Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contenido Completo</h3>
            <div className="prose prose-lg max-w-none">
              <div
                className={`whitespace-pre-wrap leading-relaxed p-6 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800 text-gray-100 border-gray-700'
                    : 'bg-gray-50 text-gray-900 border-gray-200'
                }`}
                style={{
                  lineHeight: '1.8',
                  fontSize: `${fontSize}px`,
                  fontFamily: 'Georgia, serif',
                  textAlign: 'justify',
                  textIndent: '2em',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  padding: '24px',
                  borderRadius: '8px',
                  boxShadow: isDark
                    ? '0 1px 3px 0 rgba(0, 0, 0, 0.5)'
                    : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}
              >
                {article.cleaned_content || article.content || article.contenido || 'Contenido no disponible'}
              </div>
            </div>
            
            {/* Reading Stats */}
            <div className={`flex items-center justify-between text-sm p-4 rounded-lg ${
              isDark
                ? 'bg-gray-800 text-gray-300 border border-gray-700'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Tiempo de lectura: {articleService.calculateReadingStats(article.cleaned_content || article.content || article.contenido || '').readingTime} min
                </span>
                <span>📝 {articleService.calculateReadingStats(article.cleaned_content || article.content || article.contenido || '').wordCount} palabras</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Calidad:</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= 4 ? 'text-yellow-400' : 'text-gray-300'}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {article.fecha && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Información Adicional</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                Fecha del artículo: {articleService.formatDate(article.fecha)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {article.url && (
              <Button
                variant="outline"
                onClick={() => window.open(article.url, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Artículo Original
              </Button>
            )}
            <Button
              variant="outline"
              onClick={shareArticle}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartir Artículo
            </Button>
            {!article.is_saved && (
              <Button
                onClick={saveArticle}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookMarked className="h-4 w-4" />
                )}
                Guardar en Mis Artículos
              </Button>
            )}
            {article.is_saved && (
              <Button
                onClick={unsaveArticle}
                disabled={isSaving}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar de Guardados
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
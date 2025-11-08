import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  User, 
  Globe, 
  Tag,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Loader2,
  Share2,
  Download,
  RefreshCw
} from 'lucide-react';
import { News } from '../../services/news.service';
import { useNews } from '../../hooks/useNews';
import { formatDate } from '../../utils/formatDate';

interface NewsDetailProps {
  news: News;
  onClose: () => void;
  onBack: () => void;
}

const NewsDetail: React.FC<NewsDetailProps> = ({ news, onClose, onBack }) => {
  const {
    toggleSelection,
    humanizeNews,
    exportNews,
    isNewsSelected
  } = useNews({ autoFetch: false });

  const [isHumanizing, setIsHumanizing] = useState(false);
  const [showHumanized, setShowHumanized] = useState(false);
  const [humanizationOptions, setHumanizationOptions] = useState({
    tone: 'professional',
    style: 'detailed',
    complexity: 'intermediate'
  });

  const isSelected = isNewsSelected(news.id);

  const handleToggleSelection = async () => {
    await toggleSelection(news.id);
  };

  const handleHumanize = async () => {
    setIsHumanizing(true);
    try {
      await humanizeNews(news.id, humanizationOptions);
      setShowHumanized(true);
    } catch (error) {
      console.error('Error humanizing news:', error);
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/news?id=${news.id}`;
    navigator.clipboard.writeText(shareUrl);
    // TODO: Show toast notification
  };

  const handleExport = async () => {
    await exportNews('json', true);
  };

  const displayContent = showHumanized && news.humanized_content 
    ? news.humanized_content 
    : news.content;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Detalle de Noticia</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Título y metadata */}
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl leading-tight">
                    {news.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSelection}
                    className="p-2 h-8 w-8"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {news.categories?.map((cat, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      style={{ backgroundColor: cat.category.color + '20', color: cat.category.color }}
                    >
                      {cat.category.name}
                    </Badge>
                  ))}
                  {news.priority && news.priority > 1 && (
                    <Badge variant="destructive">
                      Prioridad {news.priority}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>{news.source}</span>
                  </div>
                  {news.author && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{news.author}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(news.published_at)}</span>
                  </div>
                  {news.reading_time && (
                    <div className="flex items-center gap-1">
                      <span>{news.reading_time} min lectura</span>
                    </div>
                  )}
                </div>

                {news.summary && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-1">Resumen</p>
                    <p className="text-sm text-blue-700">{news.summary}</p>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Contenido */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {showHumanized ? 'Contenido Humanizado' : 'Contenido Original'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {news.humanized_content && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHumanized(!showHumanized)}
                    >
                      {showHumanized ? (
                        <Eye className="h-4 w-4 mr-2" />
                      ) : (
                        <EyeOff className="h-4 w-4 mr-2" />
                      )}
                      {showHumanized ? 'Ver Original' : 'Ver Humanizado'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(news.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Original
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="space-y-4 text-sm leading-relaxed text-gray-700">
                  {displayContent?.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-justify">
                      {paragraph.split('\n').map((line, lineIndex) => (
                        <React.Fragment key={lineIndex}>
                          {line}
                          {lineIndex < paragraph.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Etiquetas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {news.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Humanización */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Humanización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tono</label>
                <Select 
                  value={humanizationOptions.tone} 
                  onValueChange={(value: any) => setHumanizationOptions(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="informal">Informal</SelectItem>
                    <SelectItem value="professional">Profesional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estilo</label>
                <Select 
                  value={humanizationOptions.style} 
                  onValueChange={(value: any) => setHumanizationOptions(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="detailed">Detallado</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="narrative">Narrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Complejidad</label>
                <Select 
                  value={humanizationOptions.complexity} 
                  onValueChange={(value: any) => setHumanizationOptions(prev => ({ ...prev, complexity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básica</SelectItem>
                    <SelectItem value="intermediate">Intermedia</SelectItem>
                    <SelectItem value="advanced">Avanzada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleHumanize}
                disabled={isHumanizing}
                className="w-full"
              >
                {isHumanizing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Humanizar Contenido
              </Button>

              {news.humanization_date && (
                <div className="text-xs text-gray-500 text-center">
                  Humanizado: {formatDate(news.humanization_date)}
                  {news.humanization_cost && (
                    <div>Costo: ${news.humanization_cost.toFixed(4)}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadatos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono">{news.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dominio:</span>
                <span>{news.domain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estado:</span>
                <Badge variant="outline">{news.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Idioma:</span>
                <span>{news.language?.toUpperCase()}</span>
              </div>
              {news.word_count && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Palabras:</span>
                  <span>{news.word_count.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Scrapeado:</span>
                <span>{formatDate(news.scraped_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Actualizado:</span>
                <span>{formatDate(news.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(news.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Original
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleToggleSelection}
              >
                {isSelected ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Deseleccionar
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Seleccionar
                  </>
                )}
              </Button>

              <Separator />

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copiar Enlace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;
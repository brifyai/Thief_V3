'use client';

import { useState, useEffect } from 'react';
import { Settings, TestTube, Newspaper, RefreshCw, Eye, Database } from 'lucide-react';
import { AuthGuard } from '@/middleware/auth-guard';
import { SmartUrlTester } from '@/components/SmartUrlTester';
import { SimpleUrlTester } from '@/components/SimpleUrlTester';
import { UrlsTableWithRetest } from '@/components/admin/UrlsTableWithRetest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LunComStatus {
  schedulerActive: boolean;
  lastScrapedTime: string | null;
  scrapingWindow: string;
  timezone: string;
  nextScrapingTime: string;
}

interface LunComNoticia {
  titulo: string;
  descripcion: string;
  fuente: string;
  url: string;
  fechaExtraccion: string;
}

export default function AdminScraperPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lunComStatus, setLunComStatus] = useState<LunComStatus | null>(null);
  const [lunComLoading, setLunComLoading] = useState(false);
  const [lunComScraping, setLunComScraping] = useState(false);
  const [savingToDB, setSavingToDB] = useState(false);
  const [lunComNoticias, setLunComNoticias] = useState<LunComNoticia[]>([]);
  const [showNoticias, setShowNoticias] = useState(false);

  useEffect(() => {
    const checkLunComStatus = async () => {
      try {
        setLunComLoading(true);
        const response = await fetch('/api/lun-com/status');
        if (response.ok) {
          const data = await response.json();
          setLunComStatus(data.status);
        }
      } catch (error) {
        console.error('Error verificando LUN.COM:', error);
      } finally {
        setLunComLoading(false);
      }
    };

    checkLunComStatus();
  }, []);

  const handleUrlSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUrlUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLunComScrape = async () => {
    setLunComScraping(true);
    setShowNoticias(false);
    try {
      const response = await fetch('/api/lun-com/scrape-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const noticias = data.noticias || [];
        
        alert(`✅ Scraping completado: ${noticias.length} noticias extraídas de LUN.COM`);
        
        // Mostrar las noticias en la UI
        setLunComNoticias(noticias);
        setShowNoticias(true);
        
        // Recargar estado
        const statusResponse = await fetch('/api/lun-com/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setLunComStatus(statusData.status);
        }
      } else {
        const error = await response.json();
        alert(`❌ Error en scraping: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error ejecutando scraping de LUN.COM:', error);
      alert('❌ Error ejecutando scraping de LUN.COM');
    } finally {
      setLunComScraping(false);
    }
  };

  const handleSaveToDatabase = async () => {
    setSavingToDB(true);
    try {
      const response = await fetch('/api/lun-com/save-to-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
      } else {
        const error = await response.json();
        alert(`❌ Error guardando: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error guardando en base de datos:', error);
      alert('❌ Error guardando noticias en la base de datos');
    } finally {
      setSavingToDB(false);
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Gestión de URLs Públicas
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra las URLs públicas disponibles para todos los usuarios
          </p>
        </div>

        {/* LUN.COM Scraper Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              LUN.COM Scraper Automático
            </CardTitle>
            <CardDescription>
              Sistema de scraping automático para lun.com con Tesseract.js OCR.
              Se ejecuta diariamente entre 00:01 y 06:00 AM (horario Santiago).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estado</span>
                <Badge variant={lunComStatus?.schedulerActive ? "default" : "secondary"}>
                  {lunComStatus?.schedulerActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Último Scraping</span>
                <span className="text-sm text-muted-foreground">
                  {lunComStatus?.lastScrapedTime
                    ? new Date(lunComStatus.lastScrapedTime).toLocaleString('es-CL')
                    : "Nunca"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Ventana</span>
                <span className="text-sm text-muted-foreground">
                  {lunComStatus?.scrapingWindow || "00:01 - 06:00 AM"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                onClick={handleLunComScrape}
                disabled={lunComScraping || lunComLoading}
                className="w-full"
                variant="outline"
              >
                {lunComScraping ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Scrapeando...
                  </>
                ) : (
                  <>
                    <Newspaper className="h-4 w-4 mr-2" />
                    Scraping Manual
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setShowNoticias(!showNoticias)}
                variant="outline"
                disabled={lunComNoticias.length === 0}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showNoticias ? 'Ocultar' : 'Ver'} Noticias
              </Button>

              <Button
                onClick={handleSaveToDatabase}
                disabled={savingToDB || lunComNoticias.length === 0}
                className="w-full"
                variant="default"
              >
                {savingToDB ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Guardar BD
                  </>
                )}
              </Button>
            </div>

            {/* Noticias extraídas */}
            {showNoticias && lunComNoticias.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Noticias Extraídas de LUN.COM
                  </CardTitle>
                  <CardDescription>
                    {lunComNoticias.length} noticias extraídas en el último scraping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {lunComNoticias.map((noticia, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <h4 className="font-medium text-sm mb-1">
                          {noticia.titulo}
                        </h4>
                        {noticia.descripcion && (
                          <p className="text-xs text-gray-600 mb-2">
                            {noticia.descripcion}
                          </p>
                        )}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Fuente: {noticia.fuente}</span>
                          <span>
                            {new Date(noticia.fechaExtraccion).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Próximos pasos:</strong> Las noticias se pueden guardar en la base de datos 
                      para que estén disponibles en el sistema de noticias principal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Tabs para diferentes métodos de prueba */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">
              Test Simple (Recomendado)
            </TabsTrigger>
            <TabsTrigger value="advanced">
              Test Avanzado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-6 w-6 text-primary" />
                  Test Simple de URLs
                </CardTitle>
                <CardDescription>
                  Usa el endpoint simple-test del backend para probar URLs rápidamente.
                  Es más fácil de usar y requiere menos configuración.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleUrlTester onUrlSaved={handleUrlSaved} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Test Avanzado de URLs
                </CardTitle>
                <CardDescription>
                  Configuración avanzada con selectores personalizados para sitios complejos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SmartUrlTester onUrlSaved={handleUrlSaved} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* URLs Table with Retest - Componente que maneja la tabla de URLs existentes */}
        <UrlsTableWithRetest
          refreshTrigger={refreshTrigger}
          onUrlUpdated={handleUrlUpdated}
        />
      </div>
    </AuthGuard>
  );
}

'use client';

import { useState } from 'react';
import { Settings, TestTube } from 'lucide-react';
import { AuthGuard } from '@/middleware/auth-guard';
import { SmartUrlTester } from '@/components/SmartUrlTester';
import { SimpleUrlTester } from '@/components/SimpleUrlTester';
import { UrlsTableWithRetest } from '@/components/admin/UrlsTableWithRetest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminScraperPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUrlSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUrlUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
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

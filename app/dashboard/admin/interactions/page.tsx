'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserInteraction {
  id: string;
  user_id: string;
  daily_limit: number;
  available_interactions: number;
  consumed_today: number;
  last_reset: string;
  updated_at: string;
  created_at: string;
}

interface InteractionLog {
  id: string;
  user_id: string;
  operation_type: string;
  interactions_deducted: number;
  metadata: any;
  created_at: string;
}

interface Settings {
  daily_limit?: string;
  [key: string]: any;
}

export default function InteractionsAdminPage() {
  const [users, setUsers] = useState<UserInteraction[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInteraction | null>(null);
  const [userHistory, setUserHistory] = useState<InteractionLog[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [assignForm, setAssignForm] = useState({ userId: '', amount: '' });
  const [limitForm, setLimitForm] = useState({ daily_limit: '' });

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/interactions/admin/interactions', {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data.data?.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/interactions/admin/interactions/settings', {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setSettings(data.data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/interactions/admin/interactions/${userId}`, {
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (!response.ok) throw new Error('Failed to load user details');
      const data = await response.json();
      setSelectedUser(data.data?.user);
      setUserHistory(data.data?.recent_history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading user details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInteractions = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/interactions/admin/interactions/assign', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer demo-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: assignForm.userId,
          amount: parseInt(assignForm.amount)
        })
      });
      if (!response.ok) throw new Error('Failed to assign interactions');
      setSuccess('Interacciones asignadas exitosamente');
      setAssignForm({ userId: '', amount: '' });
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error assigning interactions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDailyLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/interactions/admin/interactions/limit', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer demo-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          daily_limit: parseInt(limitForm.daily_limit)
        })
      });
      if (!response.ok) throw new Error('Failed to update daily limit');
      setSuccess('Límite diario actualizado exitosamente');
      setLimitForm({ daily_limit: '' });
      loadSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating daily limit');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDaily = async () => {
    if (!confirm('¿Estás seguro de que deseas resetear las interacciones diarias de todos los usuarios?')) {
      return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/interactions/admin/interactions/reset', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer demo-token' }
      });
      if (!response.ok) throw new Error('Failed to reset daily interactions');
      setSuccess('Interacciones diarias reseteadas exitosamente');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resetting daily interactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Interacciones</h1>
        <p className="text-gray-600 mt-2">Administra las interacciones de Chutes AI para los usuarios</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="assign">Asignar Interacciones</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Tab: Usuarios */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios y sus Interacciones</CardTitle>
              <CardDescription>Lista de todos los usuarios con su saldo de interacciones</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Límite Diario</TableHead>
                        <TableHead>Disponibles</TableHead>
                        <TableHead>Consumidas Hoy</TableHead>
                        <TableHead>Último Reset</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.user_id}</TableCell>
                          <TableCell>{user.daily_limit}</TableCell>
                          <TableCell className="font-bold text-blue-600">{user.available_interactions}</TableCell>
                          <TableCell>{user.consumed_today}</TableCell>
                          <TableCell className="text-sm">{new Date(user.last_reset).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadUserDetails(user.user_id)}
                            >
                              Ver Detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Usuario: {selectedUser.user_id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Saldo Disponible</Label>
                    <p className="text-2xl font-bold text-blue-600">{selectedUser.available_interactions}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Consumidas Hoy</Label>
                    <p className="text-2xl font-bold text-orange-600">{selectedUser.consumed_today}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Límite Diario</Label>
                    <p className="text-2xl font-bold">{selectedUser.daily_limit}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Último Reset</Label>
                    <p className="text-sm">{new Date(selectedUser.last_reset).toLocaleString()}</p>
                  </div>
                </div>

                {userHistory.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Historial Reciente</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userHistory.map((log) => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{log.operation_type}</p>
                              <p className="text-sm text-gray-600">{new Date(log.created_at).toLocaleString()}</p>
                            </div>
                            <p className="font-bold text-red-600">-{log.interactions_deducted}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Asignar Interacciones */}
        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignar Interacciones</CardTitle>
              <CardDescription>Asigna interacciones adicionales a un usuario específico</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignInteractions} className="space-y-4">
                <div>
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Ingresa el ID del usuario"
                    value={assignForm.userId}
                    onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Cantidad de Interacciones</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Ej: 100"
                    value={assignForm.amount}
                    onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                    required
                    min="1"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Asignando...' : 'Asignar Interacciones'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Global</CardTitle>
              <CardDescription>Configura los parámetros globales del sistema de interacciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Límite Diario Actual:</strong> {settings.daily_limit || 'No configurado'}
                </p>
              </div>

              <form onSubmit={handleUpdateDailyLimit} className="space-y-4">
                <div>
                  <Label htmlFor="dailyLimit">Nuevo Límite Diario</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    placeholder="Ej: 250"
                    value={limitForm.daily_limit}
                    onChange={(e) => setLimitForm({ daily_limit: e.target.value })}
                    required
                    min="1"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar Límite Diario'}
                </Button>
              </form>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleResetDaily}
                  disabled={loading}
                >
                  {loading ? 'Reseteando...' : 'Resetear Interacciones Diarias'}
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Esto reseteará las interacciones consumidas de todos los usuarios a 0
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

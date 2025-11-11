'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckedState } from '@radix-ui/react-checkbox';
import { formatNumber } from '@/utils/formatNumber';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, Loader2, Plus, Edit, Trash2, Shield, User as UserIcon, Pause, Play } from 'lucide-react';
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
import { AuthGuard } from '@/middleware/auth-guard';
import { getAuthHeaders, AuthenticationError } from '@/lib/api-secure';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UserInteractions {
  available: number | null;
  consumed_today: number | null;
  daily_limit: number | null;
  last_reset: string | null;
}

interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  interactions?: UserInteractions | null;
}

const DEFAULT_DAILY_LIMIT = 250;

export default function AdminUsersPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');
    
      const data = await response.json();
      const normalizedUsers: User[] = (data.data || data || []).map((user: any) => {
        const rawInteractions = user.interactions ?? null;

        const toNumberOrNull = (value: any) => {
          if (value === null || value === undefined || value === '') return null;
          const numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : null;
        };

        const parsedAvailable = toNumberOrNull(rawInteractions?.available);
        const parsedConsumedToday = toNumberOrNull(rawInteractions?.consumed_today);
        const parsedDailyLimit = toNumberOrNull(rawInteractions?.daily_limit);

        const normalizedInteractions: UserInteractions = {
          available: parsedAvailable ?? DEFAULT_DAILY_LIMIT,
          consumed_today: parsedConsumedToday ?? 0,
          daily_limit: parsedDailyLimit ?? DEFAULT_DAILY_LIMIT,
          last_reset: rawInteractions?.last_reset ?? null,
        };

        return {
          ...user,
          is_active: user.is_active ?? true,
          interactions: normalizedInteractions,
        };
      });
      setUsers(normalizedUsers);
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        // Aquí podrías redirigir al login
        return;
      }
      toast.error(error.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingUser
        ? `${API_BASE_URL}/api/users/${editingUser.id}`
        : `${API_BASE_URL}/api/auth/register`;

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar usuario');
      }

      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado exitosamente');
      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) throw new Error('Error al actualizar usuario');

      toast.success(`Usuario ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
      await loadUsers();
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }
      toast.error(error.message);
    }
  };

  const confirmDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Error al eliminar usuario');

      toast.success('Usuario eliminado exitosamente');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === 'admin').length,
    regularUsers: users.filter((u) => u.role === 'user').length,
  };

  const renderInteractionMetric = (
    value: number | null | undefined,
    fallback: number,
    className = 'font-mono'
  ) => {
    const displayValue = value ?? fallback;

    return (
      <span className={className}>{formatNumber(Number(displayValue))}</span>
    );
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra los usuarios del sistema
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground space-y-2">
          <p>
            <strong>IA:</strong> Cada usuario dispone de <strong>250 interacciones diarias reales</strong>.
            Una interacción corresponde a <strong>una llamada a la API de la IA</strong> (request + response).
          </p>
          <p className="text-xs italic text-muted-foreground/90">
            Los valores de <strong>Disponibles</strong>, <strong>Usadas hoy</strong> y <strong>Límite diario</strong> se obtienen en vivo desde Supabase
            mediante la función remota <code>get_user_balance</code>. Cada cuenta inicia con un límite fijo de 250 interacciones diarias y se restablece automáticamente con el cron job de las 00:00.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Usuarios Regulares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.regularUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>👥 Lista de Usuarios</CardTitle>
            <CardDescription>
              <span>Todos los usuarios registrados en el sistema.</span>
              <span className="block font-medium text-green-600">
                Interacciones en línea desde Supabase con límite diario fijo de 250.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                📭 No hay usuarios registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Disponibles</TableHead>
                      <TableHead>Usadas hoy</TableHead>
                      <TableHead>Límite diario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => {
                      const interactions = user.interactions;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.role === 'admin' ? (
                                <Shield className="h-4 w-4 text-blue-600" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-gray-600" />
                              )}
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <Badge variant="default">
                                <Shield className="mr-1 h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Usuario</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {renderInteractionMetric(
                              interactions?.available,
                              DEFAULT_DAILY_LIMIT
                            )}
                          </TableCell>
                          <TableCell>
                            {renderInteractionMetric(
                              interactions?.consumed_today,
                              0,
                              'font-mono text-muted-foreground'
                            )}
                          </TableCell>
                          <TableCell>
                            {renderInteractionMetric(
                              interactions?.daily_limit,
                              DEFAULT_DAILY_LIMIT,
                              'font-mono text-muted-foreground'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_active ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-400 text-white hover:bg-gray-400">
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={user.is_active ? 'secondary' : 'default'}
                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                className="flex items-center gap-1"
                              >
                                {user.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                {user.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => confirmDelete(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Modifica los datos del usuario'
                  : 'Completa los datos para crear un nuevo usuario'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'user') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario Regular</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="is_active" className="pr-4">
                  Usuario activo
                </Label>
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: CheckedState) =>
                    setFormData((prev) => ({ ...prev, is_active: checked === true }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El usuario será eliminado permanentemente
                del sistema junto con todos sus datos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar Usuario
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  );
}

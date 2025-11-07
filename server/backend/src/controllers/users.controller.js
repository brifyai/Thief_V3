const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');
const interactionManager = require('../services/interactionManager.service');

const mapUserWithInteractions = async (user) => {
  if (!user) return user;

  try {
    const balance = await interactionManager.getBalance(user.id);

    const toNumberOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const parsedDailyLimit = toNumberOrNull(balance?.daily_limit);
    const dailyLimit =
      parsedDailyLimit ??
      interactionManager?.defaultDailyLimit ??
      250;

    return {
      ...user,
      interactions: {
        available: toNumberOrNull(balance?.available_interactions),
        consumed_today: toNumberOrNull(balance?.consumed_today),
        daily_limit: dailyLimit,
        last_reset: balance?.last_reset ?? null
      }
    };
  } catch (error) {
    console.error('Error obteniendo interacciones del usuario:', {
      userId: user.id,
      error: error.message || error
    });

    return {
      ...user,
      interactions: null
    };
  }
};

// Obtener todos los usuarios (solo admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error en getAllUsers (Supabase):', error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener usuarios',
      });
    }

    const usersWithInteractions = await Promise.all(
      (data || []).map(async (user) => await mapUserWithInteractions(user))
    );

    res.json({
      success: true,
      data: usersWithInteractions,
    });
  } catch (error) {
    console.error('Error en getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios',
    });
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const id = req.params.id; // UUID string, no parseInt

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }
      console.error('Error en getUserById (Supabase):', error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener usuario',
      });
    }

    const userWithInteractions = await mapUserWithInteractions(user);

    res.json({
      success: true,
      data: userWithInteractions,
    });
  } catch (error) {
    console.error('Error en getUserById:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario',
    });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id; // UUID string, no parseInt
    const { name, email, password, role, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, is_active, created_at')
      .single();

    if (error) {
      console.error('Error en updateUser (Supabase):', error);
      // Violación de unique email u otras validaciones
      return res.status(400).json({
        success: false,
        error: error.message || 'Error al actualizar usuario',
      });
    }

    const userWithInteractions = await mapUserWithInteractions(user);

    res.json({
      success: true,
      data: userWithInteractions,
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error en updateUser:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
    });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id; // UUID string, no parseInt

    // Verificar que no sea el último admin
    const { data: adminRows, count: adminCount, error: adminCountError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('role', 'admin');

    if (adminCountError) {
      console.error('Error contando administradores:', adminCountError);
      return res.status(500).json({
        success: false,
        error: 'Error al validar administradores',
      });
    }

    const { data: userToDelete, error: userFetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (userFetchError) {
      if (userFetchError.code === 'PGRST116' || userFetchError.message?.includes('No rows')) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }
      console.error('Error obteniendo usuario a eliminar:', userFetchError);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener usuario',
      });
    }

    if (userToDelete.role === 'admin' && (adminCount || (adminRows?.length ?? 0)) <= 1) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el último administrador',
      });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error en deleteUser (Supabase):', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar usuario',
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error en deleteUser:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
    });
  }
};

// Obtener estadísticas de usuarios
exports.getUserStats = async (req, res) => {
  try {
    // Total de usuarios
    const { count: totalUsers, error: totalErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (totalErr) {
      console.error('Error obteniendo totalUsers:', totalErr);
      return res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }

    // Admins (puede existir columna role en ambos esquemas)
    const { count: adminUsers, error: adminErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminErr) {
      console.error('Error obteniendo adminUsers:', adminErr);
      return res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }

    // Si no existe is_active en el esquema, considerar todos como activos
    // Contar usuarios activos
    let activeUsers = totalUsers || 0;
    try {
      const { count: activeCount, error: activeErr } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (!activeErr && typeof activeCount === 'number') {
        activeUsers = activeCount;
      }
    } catch (activeError) {
      console.warn('Advertencia obteniendo usuarios activos:', activeError.message);
    }

    const regularUsers = (totalUsers || 0) - (adminUsers || 0);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        activeUsers,
        adminUsers: adminUsers || 0,
        regularUsers,
      },
    });
  } catch (error) {
    console.error('Error en getUserStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de usuarios',
    });
  }
};

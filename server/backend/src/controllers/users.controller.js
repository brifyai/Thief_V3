const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');
// Supabase client imported from config

// Obtener todos los usuarios (solo admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        last_login: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: users,
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
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        last_login: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: user,
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
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        last_login: true,
      },
    });

    res.json({
      success: true,
      data: user,
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error en updateUser:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
    });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no sea el último admin
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    });

    const userToDelete = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    if (userToDelete.role === 'admin' && adminCount === 1) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el último administrador',
      });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error en deleteUser:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
    });
  }
};

// Obtener estadísticas de usuarios
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { is_active: true },
    });
    const adminUsers = await prisma.user.count({
      where: { role: 'admin' },
    });
    const regularUsers = await prisma.user.count({
      where: { role: 'user' },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        adminUsers,
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

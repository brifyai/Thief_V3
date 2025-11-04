/**
 * Middleware para verificar roles de usuario
 * Uso: requireRole('admin') o requireRole('admin', 'moderator')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        message: 'Debes iniciar sesión para acceder a este recurso'
      });
    }

    // Verificar que el usuario tenga un rol
    if (!req.user.role) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'Tu cuenta no tiene un rol asignado'
      });
    }

    // Verificar que el rol del usuario esté en la lista de roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: `Se requiere rol: ${allowedRoles.join(' o ')}. Tu rol actual: ${req.user.role}`
      });
    }

    // Usuario autorizado
    next();
  };
};

module.exports = {
  requireRole,
};

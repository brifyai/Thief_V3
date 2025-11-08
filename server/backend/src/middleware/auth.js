const { verifyToken } = require('../utils/jwtHelper');
const { isDemoMode, supabase } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado. No se proporcionó token de autenticación.'
    });
  }

  // En modo demo o desarrollo, aceptar tokens demo
  if (isDemoMode || process.env.NODE_ENV === 'development') {
    // Si el token es "demo-token" o "demo-admin", buscar usuario admin real
    if (token === 'demo-token' || token === 'demo-admin') {
      try {
        // Buscar un usuario admin real en la base de datos
        const { data: adminUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'admin')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (error || !adminUser) {
          // Si no hay admin real, crear uno temporal para desarrollo
          req.user = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@example.com',
            name: 'Demo Admin',
            role: 'admin'
          };
        } else {
          // Usar el usuario admin real encontrado
          req.user = {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role
          };
        }
        return next();
      } catch (error) {
        console.error('Error buscando usuario admin:', error);
        // Fallback a usuario demo
        req.user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          name: 'Demo Admin',
          role: 'admin'
        };
        return next();
      }
    }
  }

  // Modo normal: verificar token JWT
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      error: 'Token inválido o expirado.'
    });
  }

  // Si el token decodado no tiene ID de usuario, buscarlo en BD
  if (!decoded.id) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', decoded.email)
        .single();

      if (error || !user) {
        return res.status(403).json({
          error: 'Usuario no encontrado en la base de datos.'
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    } catch (error) {
      console.error('Error buscando usuario:', error);
      return res.status(500).json({
        error: 'Error al verificar usuario.'
      });
    }
  } else {
    req.user = decoded;
  }

  next();
};

module.exports = {
  authenticateToken,
};

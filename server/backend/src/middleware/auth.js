const { verifyToken } = require('../utils/jwtHelper');
const { isDemoMode } = require('../config/database');

const authenticateToken = (req, res, next) => {
  // En modo demo o desarrollo, aceptar cualquier token o crear un usuario demo
  if (isDemoMode || process.env.NODE_ENV === 'development') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Si no hay token, crear usuario demo
    if (!token) {
      req.user = {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'user'
      };
      return next();
    }
    
    // Si el token es "demo-token", crear usuario demo
    if (token === 'demo-token') {
      req.user = {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'user'
      };
      return next();
    }
    
    // Intentar verificar el token normalmente
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
    
    // Si el token es inválido, crear usuario demo de todos modos
    req.user = {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'user'
    };
    return next();
  }

  // Modo normal: verificar token estrictamente
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado. No se proporcionó token de autenticación.'
    });
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      error: 'Token inválido o expirado.'
    });
  }

  req.user = decoded;
  next();
};

module.exports = {
  authenticateToken,
};

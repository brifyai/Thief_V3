const { verifyToken } = require('../utils/jwtHelper');

const authenticateToken = (req, res, next) => {
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

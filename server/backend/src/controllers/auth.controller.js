const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(401).json({ error: error.message });
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await authService.register(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en register:', error);
    res.status(400).json({ error: error.message });
  }
};

const verifyToken = (req, res) => {
  // Si llegamos aquí, el token es válido (middleware lo validó)
  res.json({ valid: true, user: req.user });
};

// Obtener información del usuario autenticado
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const supabase = require('../config/supabase');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, last_login')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
};

module.exports = {
  login,
  register,
  verifyToken,
  getMe,
};

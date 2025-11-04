const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { generateToken } = require('../utils/jwtHelper');

const login = async (email, password) => {
  // Buscar usuario por email en la tabla users de Supabase
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !users) {
    throw new Error('Credenciales inválidas');
  }

  const user = users;

  if (!user.is_active) {
    throw new Error('Usuario inactivo');
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  // Actualizar último login
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  // Generar token JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  };
};

const register = async (email, password, name) => {
  // Verificar si el usuario ya existe en la tabla users de Supabase
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new Error('El usuario ya existe');
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario en la tabla users de Supabase
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError || !newUser) {
    throw new Error('Error al crear el usuario');
  }

  // Generar token JWT
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  return {
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    }
  };
};

module.exports = {
  login,
  register,
};

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { generateToken } = require('../utils/jwtHelper');

const login = async (email, password) => {
  console.log('🔍 Login attempt - Email:', email, 'Password:', password);
  console.log('🔍 DEMO_MODE:', process.env.DEMO_MODE);
  
  // Modo demo - permitir credenciales predefinidas
  if (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === true) {
    console.log('🎭 Demo mode detected');
    if (email === 'demo@scraper.com' && password === 'demo123') {
      console.log('✅ Demo credentials match');
      const demoUser = {
        id: 'demo-user-id',
        email: 'demo@scraper.com',
        name: 'Usuario Demo',
        role: 'admin',
        is_active: true
      };

      // Generar token JWT
      const token = generateToken({
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
      });

      return {
        token,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
        }
      };
    } else {
      console.log('❌ Demo credentials do not match');
    }
    
    // Si no coinciden las credenciales de demo, continuar con el flujo normal
    // (que fallará porque no hay base de datos real)
  } else {
    console.log('🔧 Demo mode not detected');
  }

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
  // Modo demo - permitir registro de usuario demo
  if (process.env.DEMO_MODE === 'true') {
    if (email === 'demo@scraper.com' && password === 'demo123') {
      const demoUser = {
        id: 'demo-user-id',
        email: 'demo@scraper.com',
        name: name || 'Usuario Demo',
        role: 'admin',
        is_active: true
      };

      // Generar token JWT
      const token = generateToken({
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
      });

      return {
        token,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
        }
      };
    }
    
    // Para otros usuarios en modo demo, simular registro exitoso
    const newDemoUser = {
      id: `demo-user-${Date.now()}`,
      email,
      name: name || 'Usuario Demo',
      role: 'user',
      is_active: true
    };

    // Generar token JWT
    const token = generateToken({
      id: newDemoUser.id,
      email: newDemoUser.email,
      role: newDemoUser.role,
    });

    return {
      token,
      user: {
        id: newDemoUser.id,
        email: newDemoUser.email,
        name: newDemoUser.name,
        role: newDemoUser.role,
      }
    };
  }

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

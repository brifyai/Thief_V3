const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
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

/**
 * Registro robusto - Usa API de autenticación de Supabase
 * Crea usuario en auth.users y luego en tabla users personalizada
 */
const register = async (email, password, name) => {
  console.log('📝 Registro de usuario:', email);

  let newUser = null;
  const errors = [];

  // Intento 1: Usar API de autenticación de Supabase (auth.admin.createUser)
  try {
    console.log('📝 Intento 1: Crear usuario con auth.admin.createUser');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    });

    if (authError) {
      errors.push({ step: 'auth_create', code: authError.code, message: authError.message, details: authError.details, hint: authError.hint });
      console.warn('⚠️ Error en intento 1:', authError.message);
    } else if (authData?.user) {
      const userId = authData.user.id;
      console.log('✅ Usuario creado en auth.users:', { id: userId, email });

      // Ahora insertar en tabla users personalizada
      try {
        const { data: rows, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email,
            name,
            role: 'user'
          }])
          .select();

        if (insertError) {
          console.warn('⚠️ Error insertando en tabla users:', insertError.message);
          console.warn('⚠️ Detalles:', insertError);
          // No es crítico si falla la tabla personalizada
        } else if (rows && rows.length > 0) {
          newUser = rows[0];
          console.log('✅ Usuario creado en tabla users:', { id: newUser.id, email: newUser.email });
        }
      } catch (e) {
        console.warn('⚠️ Error insertando en tabla users (throw):', e.message);
      }

      // Si no se insertó en tabla personalizada, crear objeto de usuario desde auth
      if (!newUser) {
        newUser = {
          id: userId,
          email,
          name,
          role: 'user'
        };
      }
    }
  } catch (e) {
    errors.push({ step: 'auth_create_throw', code: e.code, message: e.message });
    console.warn('⚠️ Error en intento 1 (throw):', e.message);
  }

  // Intento 2: Inserción directa en tabla users (fallback)
  if (!newUser) {
    try {
      console.log('📝 Intento 2: Inserción directa en tabla users');
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: rows, error } = await supabase
        .from('users')
        .insert([{
          email,
          password: hashedPassword,
          name,
          role: 'user'
        }])
        .select();

      if (error) {
        errors.push({ step: 'insert_direct', code: error.code, message: error.message, details: error.details, hint: error.hint });
        console.warn('⚠️ Error en intento 2:', error.message);
      } else if (rows && rows.length > 0) {
        newUser = rows[0];
        console.log('✅ Usuario creado en intento 2:', { id: newUser.id, email: newUser.email });
      }
    } catch (e) {
      errors.push({ step: 'insert_direct_throw', code: e.code, message: e.message });
      console.warn('⚠️ Error en intento 2 (throw):', e.message);
    }
  }

  // Si seguimos sin usuario, reportar con detalle
  if (!newUser) {
    console.error('❌ Registro fallido - todos los intentos fallaron', { errors });
    const err = new Error('Error al crear el usuario');
    if (errors.length > 0) {
      const first = errors[0];
      err.code = first?.code;
      err.details = first?.details || first?.message;
      err.hint = first?.hint;
    }
    throw err;
  }

  console.log('✅ Usuario registrado exitosamente:', { id: newUser.id, email: newUser.email });

  // Generar token JWT
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role || 'user',
  });

  return {
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role || 'user',
    }
  };
};

module.exports = {
  login,
  register,
};

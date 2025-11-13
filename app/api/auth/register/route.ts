import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API: Intento de registro...');
    
    const body = await request.json();
    const { email, password, name } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      );
    }
    
    console.log(`📧 Registro attempt for: ${email}`);
    
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0] || 'Usuario'
        }
      }
    });
    
    // Si el registro fue exitoso pero no hay sesión, intentar login automático
    let sessionToken = authData.session?.access_token;
    if (!sessionToken && !authError) {
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      sessionToken = loginData.session?.access_token;
    }
    
    if (authError) {
      console.error('❌ Error de registro:', authError.message);
      return NextResponse.json(
        { error: 'Error al registrar usuario', details: authError.message },
        { status: 400 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 400 }
      );
    }
    
    // Crear perfil en la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name: name || email.split('@')[0] || 'Usuario',
        role: 'user',
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('❌ Error creando perfil de usuario:', userError);
      // No fallamos completamente si el perfil no se crea, el usuario ya existe en auth
    }
    
    // Crear respuesta
    const response = {
      success: true,
      token: sessionToken || '',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userData?.role || 'user',
        name: userData?.name || name || authData.user.email?.split('@')[0] || 'Usuario',
        created_at: userData?.created_at || authData.user.created_at
      },
      message: 'Usuario registrado exitosamente'
    };
    
    console.log('✅ Registro exitoso para:', email);
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error general en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
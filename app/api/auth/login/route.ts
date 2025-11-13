import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vdmbvordfslrpnbkozig.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_Z2QYOuGA7OzT_EBTeqGRkg_xLRh1fXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API: Intento de login...');
    
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      );
    }
    
    console.log(`📧 Login attempt for: ${email}`);
    
    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError.message);
      return NextResponse.json(
        { error: 'Credenciales inválidas', details: authError.message },
        { status: 401 }
      );
    }
    
    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: 'No se pudo iniciar sesión' },
        { status: 401 }
      );
    }
    
    // Obtener información adicional del usuario desde la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error obteniendo datos del usuario:', userError);
    }
    
    // Crear respuesta
    const response = {
      success: true,
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userData?.role || 'user',
        name: userData?.name || authData.user.email?.split('@')[0] || 'Usuario',
        created_at: userData?.created_at || authData.user.created_at,
        last_login: new Date().toISOString()
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        user: authData.session.user
      }
    };
    
    console.log('✅ Login exitoso para:', email);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error general en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
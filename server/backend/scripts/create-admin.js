const { supabase } = require('../src/config/database');
const bcrypt = require('bcryptjs');

/**
 * Script para crear usuario administrador
 * Uso: node scripts/create-admin.js
 */
async function createAdmin() {
  try {
    console.log('🔧 Creando usuario administrador...');

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️ Ya existe un usuario administrador:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Nombre: ${existingAdmin.name}`);
      console.log('\n💡 Si deseas crear otro admin, modifica este script.');
      return;
    }

    // Datos del admin
    const adminData = {
      email: 'admin@scraper.com',
      password: 'admin123', // Cambiar en producción
      name: 'Administrador',
      role: 'admin'
    };

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Crear admin
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: adminData.role,
        is_active: true
      }
    });

    console.log('\n✅ Usuario administrador creado exitosamente:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nombre: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
    
    if (error.code === 'P2002') {
      console.log('\n💡 El email ya está registrado. Usa otro email o modifica el script.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createAdmin();

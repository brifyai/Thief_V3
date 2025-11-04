/**
 * Script para crear usuarios desde la línea de comandos
 * Uso: node scripts/create-user.js email password [nombre]
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUser(email, password, name = null, role = 'user') {
  try {
    // Verificar si el usuario ya existe
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.error(`❌ Error: El usuario con email ${email} ya existe`);
      process.exit(1);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      }
    });

    console.log('\n✅ Usuario creado exitosamente:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nombre: ${user.name || 'No especificado'}`);
    console.log(`🔑 ID: ${user.id}`);
    console.log(`👮 Rol: ${user.role}`);
    console.log(`📅 Creado: ${user.created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error al crear usuario:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('\n❌ Uso incorrecto\n');
  console.log('📖 Uso: node scripts/create-user.js <email> <password> [nombre] [rol]');
  console.log('\nRoles disponibles: admin, user (default: user)');
  console.log('\nEjemplos:');
  console.log('  node scripts/create-user.js admin@example.com mypassword123 "Admin User" admin');
  console.log('  node scripts/create-user.js user@example.com pass123 "Juan Pérez" user');
  console.log('  node scripts/create-user.js user@example.com pass123 "Juan Pérez"\n');
  process.exit(1);
}

const [email, password, name, role = 'user'] = args;

if (password.length < 6) {
  console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
  process.exit(1);
}

if (!['admin', 'user'].includes(role)) {
  console.error(`❌ Error: Rol inválido "${role}". Roles válidos: admin, user`);
  process.exit(1);
}

createUser(email, password, name, role);

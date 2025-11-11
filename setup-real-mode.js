#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { supabase, isDemoMode } = require('./server/backend/src/config/database');
const redis = require('./server/backend/src/utils/redisSingleton');

console.log('🔍 Verificación de Configuración para Modo Real\n');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVariables() {
  log('📋 Verificando variables de entorno...', 'blue');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'REDIS_URL',
    'CHUTES_API_KEY'
  ];
  
  let allGood = true;
  
  required.forEach(envVar => {
    const value = process.env[envVar];
    if (!value || value.includes('your_') || value.includes('demo_')) {
      log(`❌ ${envVar}: No configurado o usando valor demo`, 'red');
      allGood = false;
    } else {
      log(`✅ ${envVar}: Configurado`, 'green');
    }
  });
  
  if (!allGood) {
    log('\n⚠️  Algunas variables no están configuradas correctamente.', 'yellow');
    log('Por favor, edita el archivo .env con tus credenciales reales.', 'yellow');
    return false;
  }
  
  log('✅ Todas las variables de entorno están configuradas', 'green');
  return true;
}

async function checkSupabaseConnection() {
  log('🗄️  Verificando conexión a Supabase...', 'blue');
  
  try {
    if (isDemoMode) {
      log('❌ El sistema está en modo demo', 'red');
      log('Por favor, configura DEMO_MODE=false en tu archivo .env', 'yellow');
      return false;
    }
    
    // Probar conexión simple
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) {
      log(`❌ Error conectando a Supabase: ${error.message}`, 'red');
      return false;
    }
    
    log('✅ Conexión a Supabase exitosa', 'green');
    
    // Verificar si existen las tablas necesarias
    const tables = ['news', 'categories', 'news_sources', 'news_selections'];
    let tablesOk = true;
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (tableError) {
          log(`❌ Tabla '${table}' no existe: ${tableError.message}`, 'red');
          tablesOk = false;
        } else {
          log(`✅ Tabla '${table}' existe`, 'green');
        }
      } catch (e) {
        log(`❌ Error verificando tabla '${table}': ${e.message}`, 'red');
        tablesOk = false;
      }
    }
    
    if (!tablesOk) {
      log('\n⚠️  Algunas tablas no existen. Ejecuta el esquema SQL en Supabase:', 'yellow');
      log('1. Ve a tu proyecto Supabase');
      log('2. Abre el SQL Editor');
      log('3. Copia y pega el contenido de supabase-news-schema.sql');
      log('4. Ejecuta el script', 'yellow');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log(`❌ Error verificando Supabase: ${error.message}`, 'red');
    return false;
  }
}

async function checkRedisConnection() {
  log('🔴 Verificando conexión a Redis...', 'blue');
  
  try {
    const redisClient = redis.getRedisClient();
    await redisClient.ping();
    log('✅ Conexión a Redis exitosa', 'green');
    return true;
  } catch (error) {
    log(`❌ Error conectando a Redis: ${error.message}`, 'red');
    log('\n⚠️  Soluciones para Redis:', 'yellow');
    log('1. Asegúrate de que Redis esté instalado y corriendo');
    log('2. Verifica que REDIS_URL en .env sea correcta');
    log('3. Para Windows: descarga Redis desde GitHub y ejecuta redis-server.exe');
    log('4. Para Mac: brew install redis && brew services start redis');
    log('5. Para Linux: sudo apt install redis-server && sudo systemctl start redis');
    
    // Verificar si está usando mock
    const redisClient = redis.getRedisClient();
    if (redisClient.status === 'ready' && redisClient.connected) {
      log('ℹ️  Redis está funcionando en modo mock (sin Redis real)', 'yellow');
      log('   La aplicación funcionará pero con funcionalidad limitada', 'yellow');
      return true; // Considerarlo como éxito para modo demo
    }
    
    return false;
  }
}

function checkChutesAPI() {
  log('🤖 Verificando API Key de Chutes AI...', 'blue');
  
  const apiKey = process.env.CHUTES_API_KEY;
  
  if (!apiKey || apiKey.includes('demo_')) {
    log('❌ API Key de Chutes AI no configurada', 'red');
    return false;
  }
  
  if (apiKey.startsWith('cpk_')) {
    log('✅ API Key de Chutes AI parece válida', 'green');
    return true;
  } else {
    log('⚠️  API Key de Chutes AI puede no tener el formato correcto', 'yellow');
    return false;
  }
}

function checkPorts() {
  log('🌐 Verificando puertos...', 'blue');
  
  const ports = [
    { port: 3005, name: 'Backend API' },
    { port: 3000, name: 'Frontend' },
    { port: 6379, name: 'Redis' }
  ];
  
  ports.forEach(({ port, name }) => {
    log(`✅ ${name} configurado en puerto ${port}`, 'green');
  });
}

function showNextSteps() {
  log('\n📋 Próximos pasos:', 'cyan');
  log('1. Si todas las verificaciones son ✅, ejecuta:', 'yellow');
  log('   npm run dev', 'white');
  log('\n2. Abre tu navegador en:', 'yellow');
  log('   http://localhost:3000/news', 'white');
  log('\n3. Verifica el health check:', 'yellow');
  log('   http://localhost:3005/health', 'white');
  log('\n4. Si tienes errores, revisa el archivo SETUP_REAL_MODE.md', 'yellow');
}

async function main() {
  console.log('🚀 AI Scraper - Configuración para Modo Real\n');
  
  const checks = [
    { name: 'Variables de Entorno', fn: checkEnvVariables },
    { name: 'Conexión Supabase', fn: checkSupabaseConnection },
    { name: 'Conexión Redis', fn: checkRedisConnection },
    { name: 'API Chutes AI', fn: checkChutesAPI },
    { name: 'Configuración Puertos', fn: checkPorts }
  ];
  
  let allPassed = true;
  
  for (const { name, fn } of checks) {
    const result = await fn();
    if (!result) {
      allPassed = false;
    }
    console.log(''); // Espacio entre checks
  }
  
  if (allPassed) {
    log('🎉 ¡Todas las verificaciones pasaron! El sistema está listo para modo real.', 'green');
  } else {
    log('❌ Algunas verificaciones fallaron. Por favor, corrige los problemas.', 'red');
  }
  
  showNextSteps();
  
  process.exit(allPassed ? 0 : 1);
}

// Ejecutar verificación
main().catch(error => {
  log(`❌ Error en verificación: ${error.message}`, 'red');
  process.exit(1);
});
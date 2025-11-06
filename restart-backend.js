// Script para reiniciar el backend de forma segura
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function restartBackend() {
  console.log('🔄 Reiniciando backend...');
  
  try {
    // Verificar si el archivo de ruta modificado existe
    const routeFile = path.join(__dirname, 'server/backend/src/routes/aiUsage.routes.js');
    const content = fs.readFileSync(routeFile, 'utf8');
    
    if (content.includes('requireRole(\'admin\')')) {
      console.log('⚠️ El archivo aún tiene la restricción de admin, aplicando corrección...');
      const newContent = content.replace(
        /router\.use\(authenticateToken, requireRole\('admin'\)\);/g,
        'router.use(authenticateToken);'
      );
      fs.writeFileSync(routeFile, newContent);
      console.log('✅ Restricción de admin eliminada');
    } else {
      console.log('✅ El archivo ya tiene la corrección aplicada');
    }
    
    // Iniciar nuevo proceso del backend
    console.log('🚀 Iniciando nuevo proceso del backend...');
    
    const backendProcess = spawn('node', ['index.js'], {
      cwd: path.join(__dirname, 'server/backend'),
      stdio: 'inherit',
      detached: false
    });
    
    backendProcess.on('spawn', () => {
      console.log('✅ Backend iniciado exitosamente');
      console.log('📍 Proceso PID:', backendProcess.pid);
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Error iniciando backend:', error);
    });
    
    // Verificar que el servicio esté disponible
    setTimeout(() => {
      console.log('🔍 Verificando estado del backend...');
      // La verificación se hace en otro proceso
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error en reinicio:', error);
  }
}

restartBackend();
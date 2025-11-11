// Script para terminar procesos y aplicar corrección
const { execSync } = require('child_process');

function killAndFix() {
  console.log('🔄 Terminando procesos del backend...');
  
  try {
    // Forzar kill del proceso en puerto 3005
    execSync('netstat -ano | findstr :3005', { stdio: 'ignore' });
    console.log('📊 Procesos en puerto 3005 encontrados, terminando...');
    
    // Usar PowerShell para terminar procesos en el puerto 3005
    const killCommand = `powershell -Command "& { Get-Process -Id (Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force }"`;
    execSync(killCommand, { stdio: 'inherit' });
    
  } catch (error) {
    console.log('ℹ️ No hay procesos para terminar o error en terminación');
  }
  
  // Aplicar corrección de permisos
  const fs = require('fs');
  const path = require('path');
  
  try {
    const routeFile = path.join(__dirname, 'server/backend/src/routes/aiUsage.routes.js');
    let content = fs.readFileSync(routeFile, 'utf8');
    
    // Asegurar que no hay restricción de admin
    if (content.includes('requireRole(\'admin\')')) {
      content = content.replace(/router\.use\(authenticateToken, requireRole\('admin'\)\);/g, 'router.use(authenticateToken);');
      fs.writeFileSync(routeFile, content);
      console.log('✅ Restricción de admin eliminada definitivamente');
    } else {
      console.log('✅ Ya no hay restricciones de admin');
    }
    
    console.log('✅ Corrección aplicada exitosamente');
    
  } catch (error) {
    console.error('❌ Error aplicando corrección:', error);
  }
}

killAndFix();
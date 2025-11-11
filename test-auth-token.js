const { generateToken } = require('./server/backend/src/utils/jwtHelper');

// Generar token para usuario admin demo
const demoUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@example.com',
  name: 'Demo Admin',
  role: 'admin'
};

const token = generateToken(demoUser);

console.log('🔑 Token de autenticación generado:');
console.log(token);
console.log('\n📋 Instrucciones:');
console.log('1. Copia este token');
console.log('2. Abre la aplicación en el navegador');
console.log('3. Abre la consola de desarrollador (F12)');
console.log('4. Ejecuta: localStorage.setItem("token", "' + token + '")');
console.log('5. Recarga la página');
console.log('\n🌐 URLs de acceso:');
console.log('Frontend: http://localhost:3000');
console.log('Backend API: http://localhost:3005');
console.log('\n🧪 Para probar la API directamente:');
console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:3005/api/public-urls');
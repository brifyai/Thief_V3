const axios = require('axios');

async function debugServerConfig() {
  try {
    console.log('🔍 Debugging server config loader...');
    
    // Test directo del config loader en el servidor
    const response = await axios.post('http://localhost:3005/api/simple-test/debug', {
      url: 'https://www.lacuarta.com'
    }, {
      timeout: 30000
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2).substring(0, 1000));
    }
  }
}

debugServerConfig();
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/sites',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ API Response:');
      console.log(`Total sites: ${json.sites ? json.sites.length : 0}`);
      if (json.sites && json.sites.length > 0) {
        console.log('First 3 sites:');
        json.sites.slice(0, 3).forEach(site => {
          console.log(`  - ${site.name} (${site.domain}) - Enabled: ${site.enabled}`);
        });
      }
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.log('Raw response:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.end();

const axios = require('axios');
const fs = require('fs');

const sites = [
  'https://www.lacuarta.com',
  'https://www.lanacion.cl', 
  'https://www.24horas.cl',
  'https://www.meganoticias.cl',
  'https://www.chilevision.cl',
  'https://www.biobiochile.cl',
  'https://www.cooperativa.cl',
  'https://www.adnradio.cl',
  'https://tele13radio.cl',
  'https://www.bloomberglinea.com/latinoamerica/chile/',
  'https://chocale.cl'
];

async function analyzeSite(siteUrl) {
  try {
    console.log(`🔍 Analizando: ${siteUrl}`);
    
    const response = await axios.get(siteUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Guardar HTML para análisis
    const filename = siteUrl.replace(/https?:\/\//, '').replace(/[^\w]/g, '_') + '.html';
    fs.writeFileSync(filename, response.data);
    
    console.log(`✅ Guardado: ${filename} (${response.data.length} caracteres)`);
    
  } catch (error) {
    console.log(`❌ Error con ${siteUrl}: ${error.message}`);
  }
}

async function main() {
  console.log('🌐 Descargando sitios para análisis...');
  for (const site of sites) {
    await analyzeSite(site);
    // Pausa para no saturar los servidores
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log('🎉 Análisis completado');
}

main();
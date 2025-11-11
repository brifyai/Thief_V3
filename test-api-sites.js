#!/usr/bin/env node

/**
 * Script para probar el endpoint /api/admin/sites
 */

const https = require('https');
const http = require('http');

async function testAPI() {
  const url = 'http://localhost:3000/api/admin/sites';
  
  console.log('🔍 Probando endpoint:', url);
  console.log('⏳ Esperando respuesta...\n');
  
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      console.log('');
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Respuesta JSON válida:');
          console.log(JSON.stringify(parsed, null, 2));
          console.log('');
          console.log('🔍 Análisis:');
          console.log('  - Tipo de data:', typeof parsed);
          console.log('  - Es array:', Array.isArray(parsed));
          console.log('  - Propiedades:', Object.keys(parsed));
          console.log('  - data.sites:', parsed.sites);
          console.log('  - Array.isArray(data.sites):', Array.isArray(parsed.sites));
          if (parsed.sites) {
            console.log('  - data.sites.length:', parsed.sites.length);
          }
          resolve(parsed);
        } catch (error) {
          console.error('❌ Error parseando JSON:', error.message);
          console.log('📝 Respuesta raw:', data);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Error en la solicitud:', error.message);
      reject(error);
    });
  });
}

testAPI().catch(console.error);

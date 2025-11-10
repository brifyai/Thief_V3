#!/usr/bin/env node

/**
 * Script para analizar el bundle de la aplicación
 * Genera reportes detallados del tamaño y composición de los chunks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analizando bundle de la aplicación...\n');

// Verificar si el directorio .next existe
if (!fs.existsSync('.next')) {
  console.log('❌ El directorio .next no existe. Ejecutando build primero...\n');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error al ejecutar el build:', error.message);
    process.exit(1);
  }
}

// Analizar bundle con ANALYZE=true
console.log('📊 Generando análisis del bundle...\n');
try {
  // Usar cross-env para compatibilidad con Windows y webpack para bundle analyzer
  execSync('cross-env ANALYZE=true npm run build -- --webpack', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Error al analizar el bundle:', error.message);
  process.exit(1);
}

// Analizar tamaño de archivos en .next
console.log('\n📦 Análisis de tamaño de archivos:\n');

function analyzeDirectory(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const dirSize = analyzeDirectory(filePath, prefix + file + '/');
      totalSize += dirSize;
    } else {
      const fileSize = stat.size;
      totalSize += fileSize;
      
      const sizeKB = (fileSize / 1024).toFixed(2);
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      
      if (fileSize > 1024 * 100) { // Mostrar archivos mayores a 100KB
        console.log(`${prefix}${file}: ${sizeKB} KB (${sizeMB} MB)`);
      }
    }
  });
  
  return totalSize;
}

const nextDir = '.next';
if (fs.existsSync(nextDir)) {
  const totalSize = analyzeDirectory(nextDir);
  const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`\n📊 Tamaño total de .next: ${totalMB} MB`);
}

// Analizar chunks específicos
console.log('\n🎯 Análisis de chunks principales:\n');

const staticDir = '.next/static';
if (fs.existsSync(staticDir)) {
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunks = fs.readdirSync(chunksDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(chunksDir, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          size: stat.size,
          sizeKB: (stat.size / 1024).toFixed(2)
        };
      })
      .sort((a, b) => b.size - a.size);
    
    chunks.slice(0, 10).forEach(chunk => {
      console.log(`${chunk.name}: ${chunk.sizeKB} KB`);
    });
    
    if (chunks.length > 10) {
      console.log(`... y ${chunks.length - 10} chunks más`);
    }
  }
}

// Recomendaciones de optimización
console.log('\n💡 Recomendaciones de optimización:\n');

const largeChunks = [];
if (fs.existsSync(chunksDir)) {
  const chunks = fs.readdirSync(chunksDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(chunksDir, file);
      const stat = fs.statSync(filePath);
      return {
        name: file,
        size: stat.size
      };
    })
    .filter(chunk => chunk.size > 1024 * 200); // Mayor a 200KB
  
  largeChunks.push(...chunks);
}

if (largeChunks.length > 0) {
  console.log('⚠️  Chunks grandes encontrados (>200KB):');
  largeChunks.forEach(chunk => {
    const sizeKB = (chunk.size / 1024).toFixed(2);
    console.log(`   - ${chunk.name}: ${sizeKB} KB`);
  });
  console.log('\n   Considera:');
  console.log('   • Implementar lazy loading para componentes pesados');
  console.log('   • Revisar dependencias grandes');
  console.log('   • Optimizar imports dinámicos');
} else {
  console.log('✅ No se encontraron chunks excesivamente grandes');
}

// Verificar si hay análisis de bundle generado
const analyzeDir = '.next/analyze';
if (fs.existsSync(analyzeDir)) {
  console.log('\n📈 Reportes de análisis generados en:');
  console.log(`   ${analyzeDir}/`);
  console.log('   Abre los archivos HTML en tu navegador para visualizar el análisis detallado');
}

console.log('\n🎉 Análisis del bundle completado!\n');
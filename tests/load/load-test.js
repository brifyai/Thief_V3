/**
 * Load Testing Script
 * Fase 3: Testing Automático
 * Pruebas de carga simples sin dependencias externas
 */

const http = require('http');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Load-Test-Script/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            responseTime: responseTime,
            success: res.statusCode >= 200 && res.statusCode < 400,
            body: body
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        reject({
          error: error.message,
          responseTime: responseTime,
          success: false
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async runConcurrentTest(path, concurrentUsers = 10, duration = 30000) {
    console.log(`\n🚀 Iniciando load test concurrente:`);
    console.log(`   - Path: ${path}`);
    console.log(`   - Usuarios concurrentes: ${concurrentUsers}`);
    console.log(`   - Duración: ${duration}ms`);
    console.log(`   - Inicio: ${new Date().toISOString()}`);

    const startTime = performance.now();
    const promises = [];
    const results = [];

    // Función para un usuario simulado
    const simulateUser = async (userId) => {
      const userResults = [];
      const endTime = Date.now() + duration;
      
      while (Date.now() < endTime) {
        try {
          const result = await this.makeRequest(path);
          userResults.push({
            userId,
            timestamp: Date.now(),
            ...result
          });
        } catch (error) {
          userResults.push({
            userId,
            timestamp: Date.now(),
            ...error
          });
        }
        
        // Pequeña pausa entre solicitudes
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }
      
      return userResults;
    };

    // Iniciar usuarios concurrentes
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(simulateUser(i + 1));
    }

    // Esperar a que todos terminen
    const userResults = await Promise.all(promises);
    const allResults = userResults.flat();
    const endTime = performance.now();

    // Analizar resultados
    const analysis = this.analyzeResults(allResults, endTime - startTime);
    
    console.log(`\n✅ Load test completado:`);
    console.log(`   - Duración total: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`   - Total de solicitudes: ${analysis.totalRequests}`);
    console.log(`   - Solicitudes exitosas: ${analysis.successfulRequests}`);
    console.log(`   - Solicitudes fallidas: ${analysis.failedRequests}`);
    console.log(`   - Tasa de éxito: ${analysis.successRate}%`);
    console.log(`   - Tiempo de respuesta promedio: ${analysis.avgResponseTime.toFixed(2)}ms`);
    console.log(`   - Tiempo de respuesta mínimo: ${analysis.minResponseTime.toFixed(2)}ms`);
    console.log(`   - Tiempo de respuesta máximo: ${analysis.maxResponseTime.toFixed(2)}ms`);
    console.log(`   - Solicitudes por segundo: ${analysis.requestsPerSecond.toFixed(2)}`);
    console.log(`   - Percentil 95: ${analysis.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   - Percentil 99: ${analysis.p99ResponseTime.toFixed(2)}ms`);

    return analysis;
  }

  analyzeResults(results, totalTime) {
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results
      .filter(r => r.success)
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    const analysis = {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      successRate: ((successfulRequests / results.length) * 100).toFixed(2),
      avgResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
      maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      requestsPerSecond: (results.length / (totalTime / 1000)),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99)
    };

    return analysis;
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  async runSequentialTest(paths, iterations = 100) {
    console.log(`\n🔄 Iniciando test secuencial:`);
    console.log(`   - Paths: ${paths.join(', ')}`);
    console.log(`   - Iteraciones: ${iterations}`);
    console.log(`   - Inicio: ${new Date().toISOString()}`);

    const results = [];

    for (let i = 0; i < iterations; i++) {
      for (const path of paths) {
        try {
          const result = await this.makeRequest(path);
          results.push({
            iteration: i + 1,
            path,
            timestamp: Date.now(),
            ...result
          });
        } catch (error) {
          results.push({
            iteration: i + 1,
            path,
            timestamp: Date.now(),
            ...error
          });
        }
      }
    }

    const analysis = this.analyzeResults(results, 0);
    
    console.log(`\n✅ Test secuencial completado:`);
    console.log(`   - Total de solicitudes: ${analysis.totalRequests}`);
    console.log(`   - Tasa de éxito: ${analysis.successRate}%`);
    console.log(`   - Tiempo de respuesta promedio: ${analysis.avgResponseTime.toFixed(2)}ms`);

    return analysis;
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  const tester = new LoadTester();

  async function runAllTests() {
    try {
      console.log('🧪 Iniciando Load Testing Suite');
      console.log('=====================================');

      // Test 1: Health check load test
      await tester.runConcurrentTest('/health', 5, 10000);

      // Test 2: Dashboard load test
      await tester.runConcurrentTest('/dashboard', 3, 10000);

      // Test 3: Sequential test
      await tester.runSequentialTest(['/', '/dashboard', '/login'], 50);

      console.log('\n🎉 Todos los tests de carga completados exitosamente');

    } catch (error) {
      console.error('❌ Error en load testing:', error.message);
      process.exit(1);
    }
  }

  runAllTests();
}

module.exports = LoadTester;
/**
 * Rate Limiter y Circuit Breaker para APIs externas
 * Previene sobrecarga de servicios externos y maneja fallos en cascada
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Limpiar requests antiguos
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.log(`⏳ Rate limit alcanzado, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.acquire(); // Reintentar
    }
    
    this.requests.push(now);
  }

  reset() {
    this.requests = [];
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minuto
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutos
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = [];
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker está OPEN - servicio temporalmente no disponible');
      }
      
      // Intentar recuperación
      this.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker en HALF_OPEN, intentando recuperación...');
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        console.log('✅ Circuit breaker recuperado, cambiando a CLOSED');
        this.reset();
      }
      
      return result;
      
    } catch (error) {
      this.recordFailure();
      
      if (this.state === 'HALF_OPEN') {
        console.log('❌ Fallo en HALF_OPEN, volviendo a OPEN');
        this.trip();
      }
      
      throw error;
    }
  }

  recordFailure() {
    const now = Date.now();
    this.failures.push(now);
    
    // Limpiar fallos antiguos
    this.failures = this.failures.filter(
      time => now - time < this.monitoringPeriod
    );
    
    if (this.failures.length >= this.failureThreshold && this.state === 'CLOSED') {
      this.trip();
    }
  }

  trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    console.log(`🔴 Circuit breaker OPEN - próximo intento en ${this.resetTimeout}ms`);
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = [];
    this.nextAttempt = Date.now();
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures.length,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null
    };
  }
}

// Instancias globales para diferentes servicios
const groqRateLimiter = new RateLimiter(30, 60000); // 30 requests por minuto
const groqCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 120000, // 2 minutos
  monitoringPeriod: 300000 // 5 minutos
});

const scrapingRateLimiter = new RateLimiter(10, 60000); // 10 requests por minuto
const scrapingCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minuto
  monitoringPeriod: 180000 // 3 minutos
});

module.exports = {
  RateLimiter,
  CircuitBreaker,
  groqRateLimiter,
  groqCircuitBreaker,
  scrapingRateLimiter,
  scrapingCircuitBreaker
};

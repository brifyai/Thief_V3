import { test, expect } from '@playwright/test';

/**
 * Pruebas de rendimiento y carga
 * Fase 3: Testing Automático
 */

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada prueba de rendimiento
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('debe cargar el dashboard en menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('debe tener buen First Contentful Paint (FCP)', async ({ page }) => {
    const navigationPromise = page.goto('/dashboard');
    
    // Esperar a que la página cargue
    await navigationPromise;
    
    // Obtener métricas de rendimiento
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const paintEntries = entries.filter(entry => entry.name === 'first-contentful-paint');
          if (paintEntries.length > 0) {
            resolve(paintEntries[0].startTime);
          }
        });
        
        observer.observe({ entryTypes: ['paint'] });
        
        // Fallback por si no hay métricas
        setTimeout(() => resolve(0), 3000);
      });
    });
    
    console.log(`First Contentful Paint: ${metrics}ms`);
    expect(metrics).toBeLessThan(2000); // FCP debería ser menor a 2s
  });

  test('debe tener buen Largest Contentful Paint (LCP)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Esperar a que el contenido principal cargue
    await page.waitForSelector('[data-testid="quick-stats"]', { timeout: 10000 });
    
    // Obtener LCP
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntries = entries.filter((entry: any) => entry.entryType === 'largest-contentful-paint');
          if (lcpEntries.length > 0) {
            const lastEntry = lcpEntries[lcpEntries.length - 1];
            resolve(lastEntry.startTime);
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    console.log(`Largest Contentful Paint: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500); // LCP debería ser menor a 2.5s
  });

  test('debe tener bajo Time to Interactive (TTI)', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    
    // Esperar a que la página sea interactiva
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="quick-stats"]', { timeout: 10000 });
    
    // Simular interacción del usuario
    await page.click('[data-testid="nav-sites"]');
    await page.waitForURL('**/dashboard/admin/sites**');
    
    const tti = Date.now() - startTime;
    
    console.log(`Time to Interactive: ${tti}ms`);
    expect(tti).toBeLessThan(5000); // TTI debería ser menor a 5s
  });

  test('debe manejar múltiples navegaciones rápidamente', async ({ page }) => {
    const navigationTimes: number[] = [];
    
    // Probar múltiples navegaciones
    const routes = ['/dashboard', '/dashboard/admin/sites', '/dashboard/admin/users', '/dashboard'];
    
    for (const route of routes) {
      const startTime = Date.now();
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const navigationTime = Date.now() - startTime;
      navigationTimes.push(navigationTime);
    }
    
    const averageTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
    const maxTime = Math.max(...navigationTimes);
    
    console.log(`Navigation times: ${navigationTimes.join('ms, ')}ms`);
    console.log(`Average navigation time: ${averageTime}ms`);
    console.log(`Max navigation time: ${maxTime}ms`);
    
    expect(averageTime).toBeLessThan(2000); // Promedio menor a 2s
    expect(maxTime).toBeLessThan(3000); // Máximo menor a 3s
  });

  test('debe mantener rendimiento con datos grandes', async ({ page }) => {
    // Simular carga de muchos datos
    await page.route('/api/admin/sites', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sites: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Site ${i + 1}`,
            url: `https://site${i + 1}.com`,
            status: 'active',
            lastScraped: new Date().toISOString()
          }))
        })
      });
    });
    
    const startTime = Date.now();
    
    await page.goto('/dashboard/admin/sites');
    await page.waitForSelector('[data-testid="sites-table"]', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Large data load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Debería manejar datos grandes en menos de 5s
    
    // Verificar que la tabla sea funcional
    const rows = page.locator('[data-testid="sites-table"] tbody tr');
    expect(await rows.count()).toBe(100);
  });
});

test.describe('Load Testing', () => {
  test('debe manejar múltiples usuarios simultáneos', async ({ browser }) => {
    const concurrentUsers = 5;
    const promises: Promise<any>[] = [];
    
    // Simular múltiples usuarios accediendo simultáneamente
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      const userPromise = (async () => {
        try {
          const startTime = Date.now();
          
          // Login
          await page.goto('/login');
          await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
          await page.fill('input[type="password"]', 'password123');
          await page.click('button[type="submit"]');
          await page.waitForURL('**/dashboard**');
          
          // Navegar a diferentes páginas
          await page.goto('/dashboard/admin/sites');
          await page.waitForSelector('[data-testid="sites-table"]', { timeout: 10000 });
          
          await page.goto('/dashboard/admin/users');
          await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
          
          const totalTime = Date.now() - startTime;
          
          await context.close();
          
          return { success: true, totalTime };
        } catch (error) {
          await context.close();
          return { success: false, error: (error as Error).message };
        }
      })();
      
      promises.push(userPromise);
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const averageTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.totalTime, 0) / successCount;
    
    console.log(`Concurrent users: ${concurrentUsers}`);
    console.log(`Successful sessions: ${successCount}/${concurrentUsers}`);
    console.log(`Average session time: ${averageTime}ms`);
    
    expect(successCount).toBe(concurrentUsers); // Todos deberían tener éxito
    expect(averageTime).toBeLessThan(10000); // Promedio menor a 10s
  });

  test('debe manejar ráfagas de solicitudes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Simular ráfaga de clics en navegación
    const startTime = Date.now();
    
    const navigationPromises = [
      page.click('[data-testid="nav-sites"]'),
      page.click('[data-testid="nav-users"]'),
      page.click('[data-testid="nav-dashboard"]')
    ];
    
    await Promise.all(navigationPromises);
    
    const burstTime = Date.now() - startTime;
    
    console.log(`Burst navigation time: ${burstTime}ms`);
    expect(burstTime).toBeLessThan(3000); // Debería manejar ráfagas rápidamente
  });
});

test.describe('Memory and Resource Usage', () => {
  test('no debe tener fugas de memoria significativas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Medir uso de memoria inicial
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Realizar múltiples navegaciones
    for (let i = 0; i < 10; i++) {
      await page.goto('/dashboard/admin/sites');
      await page.waitForSelector('[data-testid="sites-table"]', { timeout: 5000 });
      
      await page.goto('/dashboard/admin/users');
      await page.waitForSelector('[data-testid="users-table"]', { timeout: 5000 });
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="quick-stats"]', { timeout: 5000 });
    }
    
    // Forzar garbage collection si está disponible
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Medir uso de memoria final
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
    
    // El aumento de memoria debería ser razonable (< 50MB)
    expect(memoryIncreaseMB).toBeLessThan(50);
  });
});
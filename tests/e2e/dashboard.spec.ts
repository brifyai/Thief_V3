import { test, expect } from '@playwright/test';

/**
 * Pruebas E2E del Dashboard y funcionalidades principales
 * Fase 3: Testing Automático
 */

test.describe('Dashboard Funcionalidades', () => {
  // Login antes de cada prueba
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('debe cargar el dashboard correctamente', async ({ page }) => {
    // Verificar elementos principales del dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verificar que las estadísticas rápidas carguen
    await expect(page.locator('[data-testid="quick-stats"]')).toBeVisible({
      timeout: 10000
    });
    
    // Verificar navegación
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('debe navegar a diferentes secciones del dashboard', async ({ page }) => {
    // Navegar a sitios
    await page.click('[data-testid="nav-sites"]');
    await expect(page).toHaveURL(/\/dashboard\/admin\/sites/);
    await expect(page.locator('h1')).toContainText('Sites');
    
    // Navegar a usuarios
    await page.click('[data-testid="nav-users"]');
    await expect(page).toHaveURL(/\/dashboard\/admin\/users/);
    await expect(page.locator('h1')).toContainText('Users');
    
    // Volver al dashboard principal
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('debe mostrar y gestionar sitios correctamente', async ({ page }) => {
    // Navegar a gestión de sitios
    await page.goto('/dashboard/admin/sites');
    
    // Esperar a que cargue la tabla de sitios
    await expect(page.locator('[data-testid="sites-table"]')).toBeVisible({
      timeout: 10000
    });
    
    // Verificar que haya sitios en la tabla
    const rows = page.locator('[data-testid="sites-table"] tbody tr');
    await expect(rows.first()).toBeVisible();
    
    // Probar búsqueda
    await page.fill('[data-testid="search-input"]', 'emol');
    await expect(await rows.count()).toBeLessThan(10); // Debería filtrar resultados
    
    // Limpiar búsqueda
    await page.fill('[data-testid="search-input"]', '');
  });

  test('debe mostrar y gestionar usuarios correctamente', async ({ page }) => {
    // Navegar a gestión de usuarios
    await page.goto('/dashboard/admin/users');
    
    // Esperar a que cargue la tabla de usuarios
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({
      timeout: 10000
    });
    
    // Verificar que haya usuarios en la tabla
    const rows = page.locator('[data-testid="users-table"] tbody tr');
    await expect(rows.first()).toBeVisible();
    
    // Verificar columnas esperadas
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('debe mostrar las estadísticas rápidas', async ({ page }) => {
    // Verificar tarjetas de estadísticas
    await expect(page.locator('[data-testid="stat-total-news"]')).toBeVisible({
      timeout: 10000
    });
    await expect(page.locator('[data-testid="stat-active-sites"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-success-rate"]')).toBeVisible();
    
    // Verificar que los valores no estén vacíos
    const totalNews = page.locator('[data-testid="stat-total-news"] .stat-value');
    await expect(totalNews).not.toHaveText('0');
  });

  test('debe manejar errores de API gracefully', async ({ page }) => {
    // Intercepta una llamada a API para simular error
    await page.route('/api/metrics/general', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Error simulado' })
      });
    });
    
    // Recargar página
    await page.reload();
    await page.waitForURL('**/dashboard**');
    
    // Verificar que el dashboard aún cargue (fallback pattern)
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verificar que las estadísticas muestren valores por defecto
    await expect(page.locator('[data-testid="quick-stats"]')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('debe funcionar en mobile', async ({ page }) => {
    // Simular viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verificar que el sidebar se colapse
    await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/);
    
    // Verificar menú hamburguesa
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Abrir menú móvil
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('debe funcionar en tablet', async ({ page }) => {
    // Simular viewport tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verificar que el layout se adapte
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('debe cargar el dashboard rápidamente', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    const loadTime = Date.now() - startTime;
    
    // El dashboard debería cargar en menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });

  test('debe tener buen CLS (Cumulative Layout Shift)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Medir CLS
    const clsMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Timeout por si no hay layout shifts
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    // CLS debería ser menor a 0.1 (bueno)
    expect(clsMetrics).toBeLessThan(0.1);
  });
});
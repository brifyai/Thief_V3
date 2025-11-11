import { test, expect } from '@playwright/test';

/**
 * Pruebas E2E básicas de autenticación
 * Fase 3: Testing Automático
 */

test.describe('Autenticación Básica', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar cookies y localStorage antes de cada prueba
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('debe cargar la página de login', async ({ page }) => {
    await page.goto('/login');
    
    // Verificar que la página de login carga correctamente
    await expect(page).toHaveTitle(/AI Scraper/);
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    
    // Intentar login con credenciales inválidas
    await page.fill('input[type="email"]', 'invalido@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Esperar y verificar mensaje de error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 5000
    });
  });

  test('debe redirigir al dashboard después de login exitoso', async ({ page }) => {
    await page.goto('/login');
    
    // Login con credenciales de prueba (ajustar según necesidad)
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123'); // Ajustar contraseña real
    
    // Click en login
    await Promise.all([
      page.waitForURL('**/dashboard**'),
      page.click('button[type="submit"]')
    ]);
    
    // Verificar redirección al dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('debe mantener la sesión después de recargar', async ({ page }) => {
    await page.goto('/login');
    
    // Login exitoso
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Esperar redirección
    await page.waitForURL('**/dashboard**');
    
    // Recargar página
    await page.reload();
    
    // Verificar que todavía estamos en el dashboard (sesión mantenida)
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('debe permitir hacer logout', async ({ page }) => {
    await page.goto('/login');
    
    // Login
    await page.fill('input[type="email"]', 'camiloalegriabarra@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Buscar y hacer click en logout (ajustar selector según implementación)
    await page.click('[data-testid="logout-button"]');
    
    // Verificar redirección a login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Protección de Rutas', () => {
  test('debe redirigir a login si no está autenticado', async ({ page }) => {
    // Intentar acceder a ruta protegida sin autenticación
    await page.goto('/dashboard');
    
    // Verificar redirección a login
    await expect(page).toHaveURL(/\/login/);
  });

  test('debe permitir acceso a rutas públicas', async ({ page }) => {
    // Rutas públicas deberían ser accesibles sin autenticación
    await page.goto('/');
    await expect(page).toHaveURL(/\//);
    
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/news');
    await expect(page).toHaveURL(/\/news/);
  });
});
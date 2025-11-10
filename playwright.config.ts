import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para Testing E2E
 * Fase 3: Testing Automático
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Ejecutar pruebas en paralelo
  fullyParallel: true,
  
  // No detener en el primer error
  forbidOnly: !!process.env.CI,
  
  // Reintentar en CI
  retries: process.env.CI ? 2 : 0,
  
  // Límite de tiempo para pruebas
  timeout: 30 * 1000,
  
  // Reportero de resultados
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    ['list']
  ],
  
  // Configuración global
  use: {
    // URL base para pruebas
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Capturar screenshot en caso de fallo
    screenshot: 'only-on-failure',
    
    // Grabar video en caso de fallo
    video: 'retain-on-failure',
    
    // Traza en caso de fallo
    trace: 'on-first-retry',
    
    // Ignorar errores HTTPS en desarrollo
    ignoreHTTPSErrors: !process.env.CI,
    
    // Configuración de viewport
    viewport: { width: 1280, height: 720 },
    
    // Navegador a usar
    browserName: 'chromium',
  },

  // Configuración de proyectos para diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Pruebas móviles
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Pruebas de tablet
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Servidor web para desarrollo
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Configuración de expectativas
  expect: {
    // Tiempo de espera para assertions
    timeout: 5000,
  },

  // Directorio de salida para artefactos
  outputDir: 'test-results/',
});
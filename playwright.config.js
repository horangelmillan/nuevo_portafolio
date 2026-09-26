// @ts-check
const { defineConfig } = require('@playwright/test');

// E2E del portfolio. Servidor local reproducile vía webServer (dev) salvo
// que E2E_BASE_URL apunte a otro (p. ej. build de producción en :3101).
// Regla operativa: nunca `next build` con un `next dev` vivo (mismo .next).
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    // Matriz responsive (auditoría: el desborde del hero vivía en 360–412px,
    // rango sin cobertura): Galaxy A55, Pixel 9 y tablet.
    { name: 'a55', use: { viewport: { width: 360, height: 800 } } },
    { name: 'pixel9', use: { viewport: { width: 412, height: 924 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm exec next dev --turbopack --port 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});

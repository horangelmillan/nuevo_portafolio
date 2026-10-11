// Preloader A3: % honesto hasta 100, velo fuera y body booted.
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test('preloader — termina en 100%, se desmonta y marca booted', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  expect(await page.evaluate(() => document.body.dataset.progress)).toBe('100');
  // Desmontaje real (display:none efectivo): no intercepta hit-testing.
  await expect(page.locator('.preloader')).toHaveCount(0);
  expect(errors).toEqual([]);
});

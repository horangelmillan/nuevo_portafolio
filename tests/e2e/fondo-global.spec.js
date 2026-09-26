// Refactor base §5 (fondo vivo global): canvas fijo único, secciones
// transparentes, driver de fase por scroll. Cero cambio visual en hero
// (misma semilla 12, fase hero = v7): aquí estructura + humo, no pixel-perfect.
const { test, expect } = require('@playwright/test');

async function gotoClean(page, url) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  const resp = await page.goto(url);
  return { resp, errors };
}

test('fondo — canvas único fijo a viewport, siempre visible', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  expect(await page.locator('canvas.hero-canvas').count()).toBe(1);
  expect(await page.locator('section canvas').count()).toBe(0);
  const fixed = await page.evaluate(() => {
    const g = document.querySelector('.global-background');
    return g ? getComputedStyle(g).position : null;
  });
  expect(fixed).toBe('fixed');
  const box = await canvas.boundingBox();
  const vp = page.viewportSize();
  expect(Math.abs(box.width - vp.width)).toBeLessThan(24);
  expect(Math.abs(box.height - vp.height)).toBeLessThan(24);
  // Sigue pintando tras scroll (sin pausa offscreen).
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await expect(canvas).toBeVisible();
  expect(errors).toEqual([]);
});

test('fondo — secciones transparentes sobre el canvas', async ({ page }) => {
  const { errors } = await gotoClean(page, '/');
  const bgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section.section')).map((s) => ({
      bg: getComputedStyle(s).backgroundImage,
      color: getComputedStyle(s).backgroundColor,
    }))
  );
  expect(bgs.length).toBe(4);
  for (const { bg, color } of bgs) {
    expect(bg).toBe('none');
    expect(color === 'rgba(0, 0, 0, 0)' || color === 'transparent').toBe(true);
  }
  expect(errors).toEqual([]);
});

test('fondo — driver de fase por scroll (hero → contacto)', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const top = await page.evaluate(() => document.body.dataset.phase);
  expect(top).toBe('hero');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const bottom = await page.evaluate(() => document.body.dataset.phase);
  expect(bottom).toBe('contacto');
  expect(await canvas.getAttribute('data-phase')).toBe('contacto');
  // El campo sigue vivo: píxeles no vacíos y sin errores.
  const url = await canvas.evaluate((el) => el.toDataURL('image/png'));
  expect(url.length).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

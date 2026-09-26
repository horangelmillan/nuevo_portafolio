// Suite E2E del hero real: estructura, capas, texto, nav, responsive,
// reduced-motion, consola y evidencia visual. Sin pixel-perfect.
const { test, expect } = require('@playwright/test');

// Navega capturando errores JS/console desde el inicio. No se ignora nada:
// el test que use este helper debe afirmar `errors` vacío.
async function gotoClean(page, url) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  const resp = await page.goto(url);
  return { resp, errors };
}

test('1 — home carga: HTTP, H1 y hero visibles', async ({ page }) => {
  const { resp, errors } = await gotoClean(page, '/');
  expect(resp.ok()).toBe(true);
  const hero = page.locator('section.hero');
  await expect(hero).toBeVisible();
  await expect(hero.locator('h1')).toContainText('Horangel Millan');
  expect(errors).toEqual([]);
});

test('2 — canvas del hero: existe, dimensionado, no intercepta', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('section.hero canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  expect(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe(
    'none'
  );
  // El canvas no intercepta: sobre el centro del H1 responde el H1.
  const h1 = page.locator('section.hero h1');
  const hb = await h1.boundingBox();
  const hit = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.tagName : null;
    },
    [hb.x + hb.width / 2, hb.y + hb.height / 2]
  );
  expect(hit).toBe('H1');
  expect(errors).toEqual([]);
});

test('3 — texto real como HTML, no dibujado en canvas', async ({ page }) => {
  const { errors } = await gotoClean(page, '/');
  const hero = page.locator('section.hero');
  await expect(hero.locator('h1')).toContainText('Horangel Millan');
  await expect(hero.locator('h2')).toContainText('Full-Stack Developer');
  const desc = await hero.locator('p').innerText();
  expect(desc.length).toBeGreaterThan(20);
  // El canvas es un bitmap vacío de nodos de texto.
  expect(await hero.locator('canvas').count()).toBe(1);
  expect(await hero.locator('canvas h1, canvas p').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('4 — capas: canvas < sombra/halo < texto', async ({ page }) => {
  const { errors } = await gotoClean(page, '/');
  const z = (sel) =>
    page.locator(sel).evaluate((el) => getComputedStyle(el).zIndex);
  expect(Number(await z('section.hero canvas.hero-canvas'))).toBe(0);
  expect(Number(await z('section.hero .hero-halo'))).toBe(1);
  expect(Number(await z('section.hero .section-content'))).toBe(2);
  expect(errors).toEqual([]);
});

test('5 — navbar visible, por encima del canvas e interactuable', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const home = page.getByRole('button', { name: 'HOME' });
  // En móvil los enlaces viven tras el burger (el logo lo alterna).
  if (!(await home.isVisible())) {
    await page.locator('.Navbar-content svg').click();
  }
  await expect(home).toBeVisible();
  // Los 4 enlaces existen con su data-link.
  expect(await page.locator('.Links button').count()).toBe(4);
  // La navbar está por encima de todo: hit-testing no toca el canvas.
  const navBox = await page.locator('.Navbar').boundingBox();
  const hit = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName}.${el.className}`.slice(0, 40) : null;
    },
    [navBox.x + 20, navBox.y + 20]
  );
  expect(hit).not.toContain('CANVAS');
  // Click real sobre HOME (los botones no tienen navegación cableada:
  // se verifica interacción sin errores, no un cambio de ruta inexistente).
  await home.evaluate((el) => el.click());
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('6 — solo la primera sección es hero', async ({ page }) => {
  const { errors } = await gotoClean(page, '/');
  expect(await page.locator('section.section').count()).toBe(4);
  expect(await page.locator('section.hero').count()).toBe(1);
  expect(await page.locator('section.section:not(.hero) canvas').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('7 — responsive: sin overflow, hero y canvas dimensionados', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  expect(noOverflow).toBe(true);
  await expect(page.locator('section.hero')).toBeVisible();
  await expect(page.locator('section.hero h1')).toBeVisible();
  const box = await page.locator('section.hero canvas').boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

test('8 — reduced-motion: composición estática visible, sin errores', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('/');
  const canvas = page.locator('section.hero canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1500);
  // Frame estático: dos lecturas separadas 1.2s deben ser idénticas.
  const shot = () =>
    canvas.evaluate((el) => el.toDataURL('image/png'));
  const a = await shot();
  await page.waitForTimeout(1200);
  const b = await shot();
  expect(a.length).toBeGreaterThan(1000);
  expect(b).toBe(a);
  await ctx.close();
  expect(errors).toEqual([]);
});

test('9 — consola limpia durante 3s de animación', async ({ page }) => {
  const { errors } = await gotoClean(page, '/');
  await expect(page.locator('section.hero canvas')).toBeVisible();
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
});

test('10 — screenshot del hero como evidencia', async ({ page }, testInfo) => {
  await gotoClean(page, '/');
  const hero = page.locator('section.hero');
  await expect(hero).toBeVisible();
  await page.waitForTimeout(2000);
  await hero.screenshot({ path: process.env.HERO_SHOT || testInfo.outputPath('hero.png') });
});

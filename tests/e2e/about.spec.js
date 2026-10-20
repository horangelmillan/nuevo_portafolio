// Overlay About A3: abrir/cerrar (botón, backdrop, ESC), ir a sección y copiar.
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

async function gotoBooted(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
}

// En móvil el menú vive fuera del viewport (margin-top:-50rem) con caja no
// vacía: Playwright lo ve "visible" aunque no se puede clickar. Se fuerza
// apertura por posición real en viewport, no por isVisible().
async function openAbout(page) {
  const about = page.getByRole('button', { name: 'SOBRE MÍ' });
  const inViewport = await about.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  });
  if (!inViewport) {
    await page.locator('.Navbar-content svg').click();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-link="/me"]');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      },
      null,
      { timeout: 8000 }
    );
  }
  await about.click();
  await expect(page.locator('.about-overlay.open')).toBeVisible();
}

test('about — SOBRE MÍ abre el panel con rol dialog', async ({ page }) => {
  await gotoBooted(page);
  await openAbout(page);
  await expect(page.getByRole('dialog', { name: 'Sobre mí' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar panel sobre mí' })).toBeFocused();
  // El panel nace debajo de la nav (la nav no lo interrumpe). En móvil se
  // espera a que el burger colapse (transición 1.5s; colapsado ≈120px).
  await page.waitForFunction(
    () => document.querySelector('.Navbar').getBoundingClientRect().height < 130,
    null,
    { timeout: 8000 }
  );
  // El panel re-sincroniza su top al terminar el colapso: espera por estado
  // (panel bajo la nav), no por margen fijo.
  await page.waitForFunction(
    () => {
      const nav = document.querySelector('.Navbar').getBoundingClientRect();
      const panel = document.querySelector('.about-panel').getBoundingClientRect();
      return panel.y >= nav.y + nav.height - 2;
    },
    null,
    { timeout: 8000 }
  );
  const [nav, panel] = await Promise.all([
    page.locator('.Navbar').boundingBox(),
    page.locator('.about-panel').boundingBox(),
  ]);
  expect(panel.y).toBeGreaterThanOrEqual(nav.y + nav.height - 2);
});

test('about — cerrar por botón y por ESC', async ({ page }) => {
  await gotoBooted(page);
  await openAbout(page);
  await page.getByRole('button', { name: 'Cerrar panel sobre mí' }).click();
  await expect(page.locator('.about-overlay.open')).toHaveCount(0);
  await openAbout(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.about-overlay.open')).toHaveCount(0);
});

test('about — copiar email deja "Copiado" y el portapapeles', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await gotoBooted(page);
  await openAbout(page);
  await page.locator('.about-panel').getByRole('button', { name: 'Copiar email' }).click();
  await expect(page.locator('.about-panel').getByRole('button', { name: 'Copiado' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await page.evaluate(() => document.querySelector('.about-mail').textContent)
  );
});

test('about — "Ver la sección" cierra y baja a sobre-mí', async ({ page }) => {
  await gotoBooted(page);
  const vh = await page.evaluate(() => window.innerHeight);
  await openAbout(page);
  await page.getByRole('button', { name: 'Ver la sección sobre mí' }).click();
  await expect(page.locator('.about-overlay.open')).toHaveCount(0);
  await page.waitForFunction(
    (minY) => window.scrollY > minY,
    vh * 0.5,
    { timeout: 8000 }
  );
});

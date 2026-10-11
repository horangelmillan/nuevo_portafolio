// RevealText (Sobre mí): estructura accesible y revelado por scroll.
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

async function gotoSobreMi(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  return { errors };
}

test('reveal — palabras envueltas y texto íntegro accesible', async ({ page }) => {
  const { errors } = await gotoSobreMi(page);
  const sobreMi = page.locator('section.section:nth-child(2) .reveal-text');
  await expect(sobreMi).toHaveCount(1);
  // Texto corrido legible (sin aria-trucos: los spans no ocultan nada y el
  // link es real y focable).
  const full = await sobreMi.textContent();
  expect(full).toContain('Consultor SAP BTP en MundoCloud');
  expect(full).toContain('automatización de procesos');
  expect(await sobreMi.locator('[data-w]').count()).toBeGreaterThan(20);
  // Frases de acento marcadas sin cambiar el texto + MundoCloud como link.
  expect(await sobreMi.locator('[data-a]').count()).toBeGreaterThanOrEqual(3);
  const mundo = sobreMi.locator('a[href="https://www.mundocloud.co"]');
  await expect(mundo).toHaveCount(1);
  await expect(mundo).toHaveText('MundoCloud');
  const academlo = sobreMi.locator('a[href="https://www.academlo.com"]');
  await expect(academlo).toHaveCount(1);
  await expect(academlo).toHaveText('Academlo');
  expect(await page.locator('section.section:nth-child(2) .reveal-closing').count()).toBe(1);
  expect(await page.locator('section.section:nth-child(2) .reveal-closing').first().textContent()).toContain('conecta el negocio con la tecnología');
  expect(errors).toEqual([]);
});

test('reveal — tenue al entrar y completo al centrar', async ({ page }) => {
  await gotoSobreMi(page);
  const vh = await page.evaluate(() => window.innerHeight);
  // Lleva el centro del párrafo al borde inferior (progreso 0 → tenue).
  await page.evaluate((targetY) => {
    const p = document.querySelector('section.section:nth-child(2) .reveal-text');
    const r = p.getBoundingClientRect();
    window.scrollBy(0, r.top + r.height / 2 - targetY);
  }, vh * 1.0);
  await page.waitForTimeout(400);
  const dim = await page.evaluate(() => {
    const spans = document.querySelectorAll('section.section:nth-child(2) .reveal-text [data-w]');
    return [parseFloat(spans[0].style.opacity), parseFloat(spans[spans.length - 1].style.opacity)];
  });
  expect(dim[0]).toBeLessThan(0.5);
  expect(dim[1]).toBeLessThan(0.5);
  // Al centrar, todas a opacidad 1.
  await page.evaluate(() => {
    document.querySelector('section.section:nth-child(2) .reveal-text').scrollIntoView({ block: 'center' });
  });
  await page.waitForFunction(
    () =>
      Array.from(
        document.querySelectorAll('section.section:nth-child(2) .reveal-text [data-w]')
      ).every((s) => s.style.opacity === '1'),
    null,
    { timeout: 5000 }
  );
});

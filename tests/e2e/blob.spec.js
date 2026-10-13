// Blob ambiental (A2): existe tras las tarjetas y cambia de color con la activa.
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

async function gotoProyectos(page) {
  await page.goto('/');
  // El preloader (A3) bloquea puntero al inicio: esperar su salida.
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  await page.evaluate(() => {
    document.querySelectorAll('section.section')[2].scrollIntoView({ block: 'center' });
  });
  await page.locator('.carousel-track').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
}

const blobColor = (page) =>
  page.evaluate(() => document.querySelector('.project-blob').dataset.color);

test('blob — visible tras las tarjetas con el color del primer proyecto', async ({ page }) => {
  await gotoProyectos(page);
  const blob = page.locator('.project-blob');
  await expect(blob).toBeVisible();
  expect(await blobColor(page)).toBe('#cf4409');
  // Sin gestos: pointer-events none para no secuestrar el drag.
  expect(await blob.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
});

test('blob — la flecha cambia su color al del proyecto activo', async ({ page }) => {
  await gotoProyectos(page);
  await page.locator('.carousel-ctrl.right').click();
  await page.waitForFunction(
    () => document.querySelector('.project-blob').dataset.color === '#a4133c',
    null,
    { timeout: 5000 }
  );
  expect(await blobColor(page)).toBe('#a4133c');
});

test('jelly — el puntero deforma y el blob recupera solo', async ({ page }) => {
  await gotoProyectos(page);
  const box = await page.locator('.carousel-view').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Contacto (aunque sea lento) abolla por solape; al irse, recupera.
  // Determinista bajo cualquier carga: no depende de la velocidad.
  const jelly = (p) =>
    p.evaluate(() => Number(document.querySelector('.project-blob').dataset.jelly));
  const isJelly = (v) =>
    page.waitForFunction(
      (want) =>
        want
          ? Number(document.querySelector('.project-blob').dataset.jelly) > 0
          : document.querySelector('.project-blob').dataset.jelly === '0',
      v,
      { timeout: 8000 }
    );
  await page.mouse.move(cx, cy);
  await isJelly(true);
  expect(await jelly(page)).toBeGreaterThan(0);
  await page.mouse.move(10, 10);
  await isJelly(false);
  // Quieto ENCIMA: queda una abolladura pequeña y ESTABLE (contacto real),
  // no una oscilación creciente: la velocidad decae en el loop. Si la
  // velocidad no decayera, inyectaría energía eternamente (>10 y creciendo).
  await page.mouse.move(cx, cy);
  await isJelly(true);
  await page.waitForTimeout(1500);
  const resting = await jelly(page);
  expect(resting).toBeLessThan(10);
  await page.waitForTimeout(800);
  expect(Math.abs((await jelly(page)) - resting)).toBeLessThan(6);
});

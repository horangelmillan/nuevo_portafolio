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
  // Medida inicial + fonts: espera por estado (asentado), no por tiempo.
  // (data-settled nace en "0": solo el efecto montado publica "1".)
  await page.waitForFunction(
    () => document.querySelector('.carousel-track').dataset.settled === '1',
    null,
    { timeout: 8000 }
  );
  await page.evaluate(() => document.fonts.ready);
  // El scrollIntoView es suave: esperar a que el scrollY se estabilice
  // antes de usar coordenadas absolutas del ratón (si no, el puntero cae
  // fuera del blob/carrusel y el gesto no registra).
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        let last = window.scrollY;
        let lastT = performance.now();
        const f = (t) => {
          const y = window.scrollY;
          if (y !== last) {
            last = y;
            lastT = t;
          } else if (t - lastT > 400) {
            resolve(true);
            return;
          }
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
        setTimeout(() => resolve(true), 10000);
      }),
    null,
    { timeout: 15000 }
  );
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
  // Espera por estado (no por tiempo fijo): resuelve cuando la gelatina
  // baja de 10 y se mantiene estable 800ms de tiempo de página.
  await page.mouse.move(cx, cy);
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const jelly = () => Number(document.querySelector('.project-blob').dataset.jelly);
        const check = () => {
          const a = jelly();
          if (a >= 10) {
            setTimeout(check, 120);
            return;
          }
          setTimeout(() => resolve(Math.abs(jelly() - a) < 6), 800);
        };
        check();
        setTimeout(() => resolve(false), 9000);
      }),
    null,
    { timeout: 12000 }
  );
  const resting = await jelly(page);
  expect(resting).toBeLessThan(10);
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const jelly = () => Number(document.querySelector('.project-blob').dataset.jelly);
        const a = jelly();
        setTimeout(() => resolve(Math.abs(jelly() - a) < 6), 800);
      }),
    null,
    { timeout: 8000 }
  );
  expect(Math.abs((await jelly(page)) - resting)).toBeLessThan(6);
});

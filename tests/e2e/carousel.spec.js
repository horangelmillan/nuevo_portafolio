// Carrusel de proyectos (A1): render, flechas, drag con inercia y teclado.
// Usa los datasets publicados por el componente (data-active-index,
// data-offset) en vez de afirmar sensaciones.
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
  await page.waitForTimeout(400); // medida inicial + fonts
}

const activeIdx = (page) =>
  page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex));
const offsetX = (page) =>
  page.evaluate(() => Number(document.querySelector('.carousel-track').dataset.offset));

test('carrusel — renderiza 4 tarjetas, flechas y estado inicial', async ({ page }) => {
  await gotoProyectos(page);
  await expect(page.locator('.carousel-card')).toHaveCount(4);
  await expect(page.locator('.carousel-ctrl.left')).toBeVisible();
  await expect(page.locator('.carousel-ctrl.right')).toBeVisible();
  const idx = await activeIdx(page);
  // Con padding de centrado, la primera tarjeta arranca centrada (índice 0
  // determinista en todos los viewports) y la anterior nace deshabilitada.
  expect(idx).toBe(0);
  await expect(page.locator('.carousel-ctrl.left')).toBeDisabled();
  // Sin canvas ajeno: el gate `section canvas = 0` sigue valiendo para todo
  // lo que no sea el blob intencional (.project-blob, A2).
  expect(await page.locator('section.section canvas:not(.project-blob)').count()).toBe(0);
  // Fade en bordes: las tarjetas se desvanecen, no se cortan en duro.
  const mask = await page.locator('.carousel-view').evaluate((el) => getComputedStyle(el).maskImage);
  expect(mask).toContain('linear-gradient');
});

test('carrusel — flecha derecha avanza exactamente una tarjeta', async ({ page }) => {
  await gotoProyectos(page);
  // Estado inicial determinista: índice 0 (primera tarjeta centrada).
  expect(await activeIdx(page)).toBe(0);
  await page.locator('.carousel-ctrl.right').click();
  await page.waitForFunction(
    () => Number(document.querySelector('.carousel').dataset.activeIndex) === 1,
    null,
    { timeout: 5000 }
  );
  expect(await activeIdx(page)).toBe(1);
  // La pista se desplazó a la izquierda (offset negativo o menor).
  expect(await offsetX(page)).toBeLessThanOrEqual(0);
});

test('carrusel — drag horizontal mueve la pista', async ({ page }) => {
  await gotoProyectos(page);
  const box = await page.locator('.carousel-view').boundingBox();
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * 0.7;
  const before = await offsetX(page);
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(x0 - (i * box.width * 0.4) / 12, y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  // Tras el snap, la pista quedó bajo cero y la tarjeta activa centrada.
  // Espera por estado (asentado), no por timeout fijo: bajo carga paralela
  // los frames rinden menos y el tiempo fijo era flaky.
  await page.waitForFunction(
    () => document.querySelector('.carousel-track').dataset.settled === '1',
    null,
    { timeout: 8000 }
  );
  const after = await offsetX(page);
  expect(after).toBeLessThan(before);
  const misalign = await page.evaluate(() => {
    const view = document.querySelector('.carousel-view');
    const track = document.querySelector('.carousel-track');
    const idx = Number(document.querySelector('.carousel').dataset.activeIndex);
    const card = track.children[idx];
    const c = card.offsetLeft + card.offsetWidth / 2 + Number(track.dataset.offset);
    return Math.abs(c - view.clientWidth / 2);
  });
  expect(misalign).toBeLessThan(2);
});

test('carrusel — drags repetidos hasta el final centran la última', async ({ page }) => {
  await gotoProyectos(page);
  const box = await page.locator('.carousel-view').boundingBox();
  const y = box.y + box.height / 2;
  for (let k = 0; k < 4; k++) {
    if ((await activeIdx(page)) === 3) break;
    const x0 = box.x + box.width * 0.7;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(x0 - (i * box.width * 0.5) / 12, y);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForFunction(
      () => document.querySelector('.carousel-track').dataset.settled === '1',
      null,
      { timeout: 8000 }
    );
  }
  // La última centra (el tope ya no "bloquea": el snap la lleva al centro)
  // y la flecha siguiente queda deshabilitada.
  expect(await activeIdx(page)).toBe(3);
  await expect(page.locator('.carousel-ctrl.right')).toBeDisabled();
});

test('carrusel — teclado ArrowRight/ArrowLeft navega', async ({ page }) => {
  await gotoProyectos(page);
  expect(await activeIdx(page)).toBe(0);
  await page.locator('.carousel').click();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    () => Number(document.querySelector('.carousel').dataset.activeIndex) === 1,
    null,
    { timeout: 5000 }
  );
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(
    () => Number(document.querySelector('.carousel').dataset.activeIndex) === 0,
    null,
    { timeout: 5000 }
  );
});

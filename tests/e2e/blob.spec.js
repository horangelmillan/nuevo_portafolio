// Blob ambiental (A2): existe tras las tarjetas y cambia de color con la activa.
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

async function gotoProyectos(page) {
  await page.goto('/');
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

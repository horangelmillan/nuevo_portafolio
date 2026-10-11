// Nav por sección: blanca sobre el hero oscuro, negra en el resto (fundido),
// letras mayores. Sin tocar el highlight ni el burger (specs existentes).
const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

async function gotoBooted(page) {
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

const linkColor = (page) =>
  // El texto visible vive en los SPANS (el `*` global los pinta directo:
  // medir el button miente).
  page.evaluate(() => getComputedStyle(document.querySelector('.Links span')).color);
const linkSize = (page) =>
  page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.Links button')).fontSize));

test('nav — blanca y mayor sobre el hero', async ({ page }) => {
  const { errors } = await gotoBooted(page);
  expect(await linkColor(page)).toBe('rgb(255, 255, 255)');
  expect(await linkSize(page)).toBeGreaterThanOrEqual(18);
  expect(errors).toEqual([]);
});

test('nav — cambia a negro al bajar a sobre-mí (suave)', async ({ page }) => {
  const { errors } = await gotoBooted(page);
  await page.evaluate(() => {
    const sec = document.querySelectorAll('section.section')[1];
    window.scrollTo(0, sec.offsetTop + sec.offsetHeight / 2 - window.innerHeight / 2);
  });
  // El fundido (.5s) termina en negro.
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('.Links span')).color === 'rgb(0, 0, 0)',
    null,
    { timeout: 8000 }
  );
  expect(await linkColor(page)).toBe('rgb(0, 0, 0)');
  expect(errors).toEqual([]);
});

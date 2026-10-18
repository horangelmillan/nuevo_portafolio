// Snap por secciones (decisión usuario 2026-10-11): cada gesto de rueda
// centra UNA sección (como la nav). El CSS puro se descartó medido (atasco).
// Estos tests afirman la nueva semántica; el dogfood fluido anterior se fue
// con ella. Sin modificar la app; solo instrumenta y reporta.
const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

// Espera a que el scroll se asiente en la banda (luego un margen cubre el
// lock de 800ms antes del siguiente gesto): el margen es estabilidad
// observada en la página (scrollY quieto 900ms), no un sleep fijo.
async function settleBand(page, target, band = 80) {
  await page.waitForFunction(
    ([t, b]) => Math.abs(window.scrollY - t) < b,
    [target, band],
    { timeout: 8000 }
  );
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
          } else if (t - lastT > 900) {
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
  const y = await page.evaluate(() => window.scrollY);
  expect(Math.abs(y - target)).toBeLessThan(band);
}

test('snap — una rueda abajo centra la siguiente sección', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  const vh = await page.evaluate(() => window.innerHeight);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.mouse.wheel(0, 300);
  // Centro de la sección 1 = exactamente 1×vh.
  await settleBand(page, vh);
});

test('snap — arriba vuelve y la ráfaga en lock no salta dos', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  const vh = await page.evaluate(() => window.innerHeight);
  await page.mouse.wheel(0, 300);
  await settleBand(page, vh);
  // Dos ruedas seguidas: la segunda cae en el lock → un solo salto.
  // (Un frame entre ambas: siguen cayendo dentro del lock de 800ms.)
  await page.mouse.wheel(0, 300);
  await page.waitForFunction(() => new Promise(requestAnimationFrame));
  await page.mouse.wheel(0, 300);
  await settleBand(page, vh * 2);
  // Tras asentarse, otra rueda sí avanza (a contacto = 3×vh).
  await page.mouse.wheel(0, 300);
  await settleBand(page, vh * 3);
  // Y hacia arriba vuelve una por una.
  await page.mouse.wheel(0, -300);
  await settleBand(page, vh * 2);
});

test('scroll — eventos, listeners y longtasks durante scroll sostenido', async ({
  page,
}) => {
  await page.goto('/');
  const stats = await page.evaluate(
    () =>
      new Promise((res) => {
        let events = 0;
        let frames = 0;
        const longtasks = [];
        let obs = null;
        try {
          obs = new PerformanceObserver((l) => {
            for (const e of l.getEntries()) longtasks.push(e.duration);
          });
          obs.observe({ entryTypes: ['longtask'] });
        } catch {
          obs = null;
        }
        const onScroll = () => events++;
        window.addEventListener('scroll', onScroll, { passive: true });
        const t0 = performance.now();
        const tick = (now) => {
          frames++;
          // zigzag con behavior instant: mide carga de listeners sin que el
          // smooth/snap interfiera en la metodología.
          window.scrollBy({ top: Math.sin(now / 300) * 30, behavior: 'instant' });
          if (now - t0 < 3000) requestAnimationFrame(tick);
          else {
            window.removeEventListener('scroll', onScroll);
            if (obs) obs.disconnect();
            res({
              events,
              frames,
              longtasks: longtasks.length,
              maxLongtask: longtasks.length ? Math.max(...longtasks) : 0,
            });
          }
        };
        requestAnimationFrame(tick);
      })
  );
  console.log(JSON.stringify(stats));
  expect(stats.events).toBeGreaterThan(0);
});

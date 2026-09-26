// Diagnóstico del scroll hacia el hero: mide la dinámica real (trayectoria,
// parones, dientes de sierra) en vez de afirmar sensaciones.
// No modifica la app; solo instrumenta y reporta métricas en el log.
const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

// Muestrea scrollY por rAF durante `ms` mientras el llamante inyecta input.
function startTrace(page, ms) {
  return page.evaluate(
    (dur) =>
      new Promise((res) => {
        const samples = [];
        const t0 = performance.now();
        const loop = (now) => {
          samples.push([Math.round(now - t0), Math.round(window.scrollY)]);
          if (now - t0 < dur) requestAnimationFrame(loop);
          else res(samples);
        };
        requestAnimationFrame(loop);
      }),
    ms
  );
}

function analyze(samples, vh) {
  const tops = [0, vh, vh * 2, vh * 3];
  let reversals = 0;
  let stalls = 0;
  let lastDir = 0;
  let stillSince = 0;
  const stops = [];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i][1] - samples[i - 1][1];
    const dir = d > 1 ? 1 : d < -1 ? -1 : 0;
    if (dir !== 0 && lastDir !== 0 && dir !== lastDir) reversals++;
    if (dir !== 0) lastDir = dir;
    if (dir === 0) {
      if (stillSince === 0) stillSince = samples[i][0];
      if (samples[i][0] - stillSince > 150) {
        stalls++;
        stillSince = -1e9; // contar una vez por parón
        const y = samples[i][1];
        const near = tops.findIndex((t) => Math.abs(y - t) < vh * 0.15);
        if (near >= 0) stops.push(near);
      }
    } else {
      stillSince = 0;
    }
  }
  const settleMs = samples.length ? samples[samples.length - 1][0] : 0;
  return {
    finalY: samples.length ? samples[samples.length - 1][1] : -1,
    settleWindowMs: settleMs,
    reversals,
    stalls,
    stopsNearSections: stops,
  };
}

test('scroll-up — un flick fuerte desde abajo hasta el hero', async ({
  page,
}) => {
  await page.goto('/');
  const vh = await page.evaluate(() => window.innerHeight);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500); // asentamiento inicial con snap
  const fromY = await page.evaluate(() => window.scrollY);

  const traceP = startTrace(page, 5000);
  await page.waitForTimeout(100);
  // Flick proporcional al viewport (3×vh): el fijo -2500px no escala a
  // viewports altos (tablet 1024: aterrizaba en 572 vs umbral 512).
  await page.mouse.wheel(0, -Math.round(vh * 3)); // flick único hacia arriba
  const samples = await traceP;
  const r = analyze(samples, vh);
  console.log(JSON.stringify({ fromY, vh, ...r }));
  // Debe terminar arriba (o muy cerca) sin quedarse colgado a mitad.
  expect(r.finalY).toBeLessThan(vh * 0.5);
});

test('scroll-up — ruedas pequeñas continuas (progreso neto)', async ({
  page,
}) => {
  await page.goto('/');
  const vh = await page.evaluate(() => window.innerHeight);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);

  const traceP = startTrace(page, 4000);
  await page.waitForTimeout(100);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, -140);
    await page.waitForTimeout(60);
  }
  const samples = await traceP;
  const r = analyze(samples, vh);
  console.log(JSON.stringify({ vh, ...r }));
  // Con input neto -1400px debe haber progreso real (>50% del input):
  // si el snap devuelve cada micro-rueda, el avance neto colapsa (era 0).
  const startY = samples.length ? samples[0][1] : vh * 3;
  expect(startY - r.finalY).toBeGreaterThan(700);
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

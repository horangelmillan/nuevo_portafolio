// Medición externa de rendimiento del hero (sin tocar el renderer).
// Métricas best-effort desde Chromium: si alguna no está disponible se
// reporta explícitamente en vez de inventarla.
const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

test('perf — rAF sostenido, long tasks y memoria durante 5s', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  const canvas = page.locator('section.hero canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);

  const sample = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        let frames = 0;
        const longtasks = [];
        let obs = null;
        try {
          obs = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              longtasks.push(Math.round(e.duration * 10) / 10);
            }
          });
          obs.observe({ entryTypes: ['longtask'] });
        } catch {
          obs = null;
        }
        const t0 = performance.now();
        const tick = (now) => {
          deltas.push(now - last);
          last = now;
          frames += 1;
          if (now - t0 < 5000) requestAnimationFrame(tick);
          else {
            if (obs) obs.disconnect();
            resolve({
              frames,
              deltas: deltas.map((d) => Math.round(d * 100) / 100),
              longtasks,
              memory: performance.memory
                ? Math.round(performance.memory.usedJSHeapSize / 1048576)
                : null,
              dpr: window.devicePixelRatio || 1,
              canvasCSS: [boxW(), boxH()],
            });
          }
          function boxW() {
            const c = document.querySelector('section.hero canvas');
            return c ? Math.round(c.getBoundingClientRect().width) : 0;
          }
          function boxH() {
            const c = document.querySelector('section.hero canvas');
            return c ? Math.round(c.getBoundingClientRect().height) : 0;
          }
        };
        requestAnimationFrame(tick);
      })
  );

  const sorted = [...sample.deltas].sort((a, b) => a - b);
  const avg = sample.deltas.reduce((s, d) => s + d, 0) / sample.deltas.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const fps = 1000 / avg;
  console.log(
    JSON.stringify({
      frames: sample.frames,
      avgFps: Math.round(fps * 10) / 10,
      avgFrameMs: Math.round(avg * 100) / 100,
      p95FrameMs: p95,
      longtasks: sample.longtasks.length,
      maxLongtaskMs:
        sample.longtasks.length > 0 ? Math.max(...sample.longtasks) : 0,
      jsHeapMB: sample.memory,
      dpr: sample.dpr,
      canvasCSS: sample.canvasCSS,
    })
  );

  // Sanidad, no benchmark estricto: la animación debe estar viva.
  // Umbral bajo a propósito: en CI/headless el raster es por software y con
  // workers en paralelo hay contención. Lo informativo son las métricas del
  // log, no esta aserción (30 frames en 5s = rAF latiendo de forma continua).
  expect(sample.frames).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

// Refactor base §5 (fondo vivo global): canvas fijo único, secciones
// transparentes, driver de fase por scroll. Cero cambio visual en hero
// (misma semilla 12, fase hero = v7): aquí estructura + humo, no pixel-perfect.
const { test, expect } = require('@playwright/test');

async function gotoClean(page, url) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  const resp = await page.goto(url);
  // El preloader (A3) bloquea puntero al inicio: esperar su salida.
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  return { resp, errors };
}

test('fondo — canvas único anclado al hero (viaja con el scroll)', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  expect(await page.locator('canvas.hero-canvas').count()).toBe(1);
  expect(await page.locator('section canvas:not(.project-blob)').count()).toBe(0);
  const pos = await page.evaluate(() => {
    const g = document.querySelector('.global-background');
    return g ? getComputedStyle(g).position : null;
  });
  expect(pos).toBe('absolute');
  const box = await canvas.boundingBox();
  const vp = page.viewportSize();
  expect(Math.abs(box.width - vp.width)).toBeLessThan(24);
  expect(Math.abs(box.height - vp.height)).toBeLessThan(24);
  // Viaja con el hero al bajar (no queda clavado): sale del viewport.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const boxAfter = await canvas.boundingBox();
  expect(boxAfter.y).toBeLessThan(0);
  expect(errors).toEqual([]);
});

test('fondo — footer visible al llegar abajo (regresión z-index)', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const footer = page.locator('.Footer');
  await expect(footer).toBeVisible();
  expect(await footer.evaluate((el) => getComputedStyle(el).opacity)).toBe(
    '1'
  );
  expect(Number(await footer.evaluate((el) => getComputedStyle(el).zIndex))).toBeGreaterThanOrEqual(
    10
  );
  await expect(footer.locator('p')).toContainText('footer');
  // Sin nada tapándolo: el centro del footer responde el footer.
  const fb = await footer.boundingBox();
  const hit = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName}.${el.className}`.slice(0, 40) : null;
    },
    [fb.x + fb.width / 2, fb.y + fb.height / 2]
  );
  expect(hit).toContain('P');
  expect(errors).toEqual([]);
});

test('fondo — hero transparente; siguientes secciones opacas y limpias', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const bgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section.section')).map((s) => ({
      hero: s.classList.contains('hero'),
      bg: getComputedStyle(s).backgroundImage,
      color: getComputedStyle(s).backgroundColor,
    }))
  );
  expect(bgs.length).toBe(4);
  for (const { hero, bg, color } of bgs) {
    const opaque =
      bg !== 'none' ||
      !(color === 'rgba(0, 0, 0, 0)' || color === 'transparent');
    if (hero) {
      // El hero muestra el canvas fijo a través.
      expect(opaque).toBe(false);
    } else {
      // Opacas: tapan el canvas al bajar (fondo limpio, sin cubos).
      expect(opaque).toBe(true);
    }
  }
  // El canvas global sigue existiendo una sola vez, detrás del contenido.
  expect(await page.locator('canvas.hero-canvas').count()).toBe(1);
  expect(await page.locator('section canvas:not(.project-blob)').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('fondo — cierre inferior: arriba denso, abajo agotado', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(2000);
  // Saturación media por franja (los cubos saturan, el fondo no): la
  // franja inferior debe estar claramente más vacía que la superior.
  // Umbral generoso: detecta ausencia del fade, no certifica la curva.
  const ratio = await canvas.evaluate((el) => {
    const c = el;
    const x = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const sat = (y0, y1) => {
      const d = x.getImageData(0, Math.floor(H * y0), W, Math.floor(H * (y1 - y0))).data;
      let s = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 12) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const mx = Math.max(r, g, b);
        if (mx > 0) s += (mx - Math.min(r, g, b)) / mx;
        n++;
      }
      return s / Math.max(1, n);
    };
    return sat(0.88, 1) / Math.max(1e-6, sat(0, 0.4));
  });
  expect(ratio).toBeLessThan(0.7);
  expect(errors).toEqual([]);
});

test('fondo — driver de fase por scroll (hero → contacto)', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const top = await page.evaluate(() => document.body.dataset.phase);
  expect(top).toBe('hero');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const bottom = await page.evaluate(() => document.body.dataset.phase);
  expect(bottom).toBe('contacto');
  expect(await canvas.getAttribute('data-phase')).toBe('contacto');
  // El campo sigue vivo: píxeles no vacíos y sin errores.
  const url = await canvas.evaluate((el) => el.toDataURL('image/png'));
  expect(url.length).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('fondo — fase sobre-mí a mitad de scroll (ida y vuelta, scroll real)', async ({
  page,
}) => {
  const { errors } = await gotoClean(page, '/');
  const canvas = page.locator('canvas.hero-canvas');
  await expect(canvas).toBeVisible();
  // Centro del viewport dentro de la 2ª sección (Sobre mí).
  await page.evaluate(() => {
    const s = document.querySelectorAll('section.section')[1];
    const top = s.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + s.offsetHeight / 2 - window.innerHeight / 2);
  });
  await page.waitForFunction(
    () => document.body.dataset.phase === 'sobre-mi',
    null,
    { timeout: 8000 }
  );
  expect(await canvas.getAttribute('data-phase')).toBe('sobre-mi');
  await expect(
    page.locator('section.section:nth-child(2) h1')
  ).toContainText('Sobre mí');
  await page.waitForTimeout(1500); // la deriva asienta tras el scroll
  const url = await canvas.evaluate((el) => el.toDataURL('image/png'));
  expect(url.length).toBeGreaterThan(1000);
  // Vuelta arriba: hero intacto, sin regresión.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(
    () => document.body.dataset.phase === 'hero',
    null,
    { timeout: 8000 }
  );
  await expect(page.locator('section.hero h1')).toContainText(
    'Horangel Millan'
  );
  expect(errors).toEqual([]);
});

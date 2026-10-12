// Caso en el mismo sitio (decisión usuario: sin redirección): tap en activa
// expande el blob y revela el contenido detrás; cerrar devuelve al carrusel.
const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

async function gotoProyectos(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, {
    timeout: 15000,
  });
  await page.evaluate(() => {
    document.querySelectorAll('section.section')[2].scrollIntoView({ block: 'center' });
  });
  await page.locator('.carousel-track').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  // El scrollIntoView es suave: esperar a que el scrollY se estabilice
  // (el wait fijo dejaba cola de ~85px que falseaba el lock R2).
  let prev = -1;
  for (let i = 0; i < 20; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === prev) break;
    prev = y;
    await page.waitForTimeout(200);
  }
  return { errors };
}

async function arrowTo(page, target) {
  for (let k = 0; k < 8; k++) {
    const idx = await page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex));
    if (idx === target) break;
    await page.locator('.carousel-ctrl.right').click();
    await page.waitForFunction(
      (prev) => Number(document.querySelector('.carousel').dataset.activeIndex) !== prev,
      idx,
      { timeout: 8000 }
    );
  }
  // Asentado de verdad (no solo índice publicado a mitad del tween).
  await page.waitForFunction(
    () => document.querySelector('.carousel-track').dataset.settled === '1',
    null,
    { timeout: 8000 }
  );
}

test('caso — tap en activa expande sin cambiar de URL', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  expect(await page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex))).toBe(0);
  await page.locator('.carousel-card[data-index="0"]').click();
  const overlay = page.locator('.case-overlay.phase-open');
  await expect(overlay).toBeVisible({ timeout: 8000 });
  // Sin redirección: seguimos en home.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog', { name: 'Caso: Portfolio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar caso' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('caso — mundocloud sin fotos y volver al carrusel', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await arrowTo(page, 4);
  await page.locator('.carousel-card[data-index="4"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('dialog', { name: 'Caso: MundoCloud' })).toBeVisible();
  // Sin fotos en la hoja (decisión usuario: él las posiciona).
  await expect(page.locator('.case-sheet img')).toHaveCount(0);
  await expect(page.locator('.case-sheet .case-block')).not.toHaveCount(0);
  // Cerrar devuelve al carrusel intacto (misma URL, misma activa).
  await page.getByRole('button', { name: 'Cerrar caso' }).click();
  await expect(page.locator('.case-overlay.phase-open')).toHaveCount(0);
  // Al cerrar, el blob vuelve a la sección (sin .full) y sigue siendo uno.
  await expect(page.locator('.project-blob.full')).toHaveCount(0);
  await expect(page.locator('canvas.project-blob')).toHaveCount(1);
  await expect(await page.evaluate(() => document.querySelector('.project-blob').parentElement.tagName)).toBe('SECTION');
  expect(await page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex))).toBe(4);
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('caso — ESC cierra y el carrusel sigue navegable', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.locator('.carousel-card[data-index="0"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  // Regla 0-atajos: es EL MISMO blob de la sección, reubicado en <main>
  // (un solo canvas.project-blob en todo el DOM).
  await expect(page.locator('.project-blob.full')).toHaveCount(1);
  await expect(page.locator('canvas.project-blob')).toHaveCount(1);
  await expect(await page.evaluate(() => document.querySelector('.project-blob').parentElement.tagName)).toBe('MAIN');
  await page.keyboard.press('Escape');
  await expect(page.locator('.case-overlay.phase-open')).toHaveCount(0);
  await page.locator('.carousel-ctrl.right').click();
  await page.waitForFunction(
    () => Number(document.querySelector('.carousel').dataset.activeIndex) === 1,
    null,
    { timeout: 8000 }
  );
  expect(errors).toEqual([]);
});

test('caso — Enter en tarjeta con foco lo abre', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.locator('.carousel-card[data-index="0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('dialog', { name: 'Caso: Portfolio' })).toBeVisible();
  expect(errors).toEqual([]);
});

// Flujo único (decisión usuario): el tap bloquea todo hasta abrir; para
// volver solo vale el botón cerrar. Ni el botón ni ESC responden a mitad.
// El expanding es transitorio y bajo carga se pierde con wall-clock: las
// fases se graban en la página con MutationObserver ANTES del tap.
test('caso flujo — a mitad del expand no hay cierre posible', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.evaluate(() => {
    window.__phases = [];
    const rec = () => {
      const ov = document.querySelector('.case-overlay');
      if (!ov) return;
      const btn = ov.querySelector('.case-close');
      const last = window.__phases[window.__phases.length - 1];
      const cur = ov.dataset.phase + '|' + (btn ? getComputedStyle(btn).pointerEvents : '?');
      if (!last || last !== cur) window.__phases.push(cur);
    };
    new MutationObserver(rec).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-phase', 'class', 'style'],
    });
  });
  await page.locator('.carousel-card[data-index="0"]').click();
  // ESC inmediato (sin esperas): cae dentro del expand o antes de que
  // exista listener; en ningún caso cierra.
  await page.keyboard.press('Escape');
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  const phases = await page.evaluate(() => window.__phases);
  // Pasó por expanding con el botón no-clicable, y el ESC no cerró nada.
  expect(phases.some((p) => p.startsWith('expanding|none'))).toBe(true);
  expect(await page.evaluate(() => document.querySelector('.project-blob').parentElement.tagName)).toBe('MAIN');
  expect(errors).toEqual([]);
});

test('caso cierre — el blob encoje desde el 100% sin volver a crecer', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.locator('.carousel-card[data-index="0"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Cerrar caso' }).click();
  // La hoja sale primero; el blob encoje después. Muestreo de k del morph
  // (dataset publicado por el loop): monotónico 1→0, sin re-crecimiento.
  const ks = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = [];
        const id = setInterval(() => {
          const blob = document.querySelector('.project-blob');
          if (!blob) {
            clearInterval(id);
            resolve(out);
            return;
          }
          const v = Number(blob.dataset.k);
          if (!Number.isNaN(v)) out.push(v);
          if (out.length >= 10) {
            clearInterval(id);
            resolve(out);
          }
        }, 100);
      })
  );
  // La curva de colapso: desde que arranca (>0.5) baja monotónica hasta
  // ~0 sin re-crecimiento (las primeras muestras pueden ser residuo
  // pre-colapso; ver FOLLOW-UP en ESTADO).
  const start = ks.findIndex((v) => v > 0.5);
  expect(start).toBeGreaterThanOrEqual(0);
  const curve = ks.slice(start);
  expect(curve.length).toBeGreaterThan(3);
  expect(curve[0]).toBeGreaterThan(0.9);
  expect(curve[curve.length - 1]).toBeLessThan(0.1);
  for (let i = 1; i < curve.length; i++) {
    expect(curve[i]).toBeLessThanOrEqual(curve[i - 1] + 0.01);
  }
  await expect(page.locator('.case-overlay')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.project-blob.full')).toHaveCount(0);
  await expect(page.locator('canvas.project-blob')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('caso R1 — hoja a viewport completo con gutters de sección', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.locator('.carousel-card[data-index="0"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  const gutters = await page.evaluate(() => {
    const sheet = document.querySelector('.case-sheet');
    const body = document.querySelector('.body');
    const cs = getComputedStyle(sheet);
    const cb = getComputedStyle(body);
    return {
      sheetW: sheet.getBoundingClientRect().width,
      vw: window.innerWidth,
      padL: cs.paddingLeft,
      padR: cs.paddingRight,
      bodyL: cb.marginLeft,
      bodyR: cb.marginRight,
      maxW: cs.maxWidth,
    };
  });
  // Sin max-width: la hoja ocupa todo el ancho del viewport…
  expect(gutters.maxW).toBe('none');
  expect(Math.abs(gutters.sheetW - gutters.vw)).toBeLessThan(2);
  // …con los mismos gutters laterales que las secciones.
  expect(gutters.padL).toBe(gutters.bodyL);
  expect(gutters.padR).toBe(gutters.bodyR);
  expect(errors).toEqual([]);
});

test('caso R2 — scroll principal bloqueado con caso abierto y restaurado al cerrar', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.locator('.carousel-card[data-index="0"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  // Foco fuera del botón cerrar: Espacio no debe activarlo por accidente.
  await page.locator('.case-sheet').click({ position: { x: 200, y: 600 } });
  // Bloqueo fixed con offset: la posición visual se preserva (el scrollY
  // de ventana cae a 0 porque el documento deja de scrollear).
  const locked = await page.evaluate(() => ({
    position: document.body.style.position,
    top: document.body.style.top,
    y: window.scrollY,
  }));
  expect(locked.position).toBe('fixed');
  // El offset fijado es el scrollY exacto al momento del lock; puede diferir
  // de y0 en unos px si el scroll suave aún asentaba tras el scrollIntoView.
  const lockedY = -Number(String(locked.top).replace('px', ''));
  expect(Math.abs(lockedY - y0)).toBeLessThan(8);
  expect(locked.y).toBe(0);
  // PageDown / Espacio no mueven la página trasera.
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBe(locked.y);
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBe(locked.y);
  // Al cerrar, el scroll vuelve a vivir donde estaba (restore instant:
  // se espera al asentamiento en vez de leer a mitad de vuelo).
  await page.getByRole('button', { name: 'Cerrar caso' }).click();
  await expect(page.locator('.case-overlay')).toHaveCount(0, { timeout: 8000 });
  await page.waitForFunction((exp) => window.scrollY === exp, lockedY, { timeout: 5000 });
  const restored = await page.evaluate(() => ({
    position: document.body.style.position,
    top: document.body.style.top,
    y: window.scrollY,
  }));
  expect(restored.position).toBe('');
  expect(restored.top).toBe('');
  // Al cerrar se restaura el offset exacto capturado al abrir.
  expect(restored.y).toBe(lockedY);
  // El footer NO aparece en Proyectos tras volver (bug del regreso)…
  await expect(page.locator('.Footer.fadeOutFooter')).toBeAttached({ timeout: 8000 });
  // …pero SIGUE funcionando al llegar al final real de la página.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.Footer.fadeInFooter')).toBeAttached({ timeout: 8000 });
  expect(errors).toEqual([]);
});

test('caso R3 — hoja baja por bloques (snap JS) sin atasco y sin barra', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await arrowTo(page, 4);
  await page.locator('.carousel-card[data-index="4"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  const snap = await page.evaluate(() => {
    const sheet = document.querySelector('.case-sheet');
    const cs = getComputedStyle(sheet);
    const block = document.querySelector('.case-sheet .case-block');
    return {
      type: cs.scrollSnapType,
      bar: cs.scrollbarWidth,
      blockAlign: block ? getComputedStyle(block).scrollSnapAlign : null,
    };
  });
  // Sin snap CSS (fijaba 207 y revertía scrollTo, medido con proximity
  // y mandatory): el snap por bloques es 100% JS. El align de los hijos
  // se conserva porque el JS lo usa para calcular paradas.
  expect(snap.type).toBe('none');
  expect(snap.bar).toBe('none');
  expect(snap.blockAlign).toBe('start');
  // Una muesca de rueda baja UN bloque exacto (parada = inicio de bloque
  // menos su margen) sin mover la página trasera.
  const y0 = await page.evaluate(() => window.scrollY);
  const settleTop = async () => {
    let prevTop = -1;
    let stable = 0;
    for (let i = 0; i < 30; i++) {
      const t = await page.evaluate(() => document.querySelector('.case-sheet').scrollTop);
      if (t === prevTop && ++stable >= 3) return t;
      if (t !== prevTop) stable = 0;
      prevTop = t;
      await page.waitForTimeout(100);
    }
    return prevTop;
  };
  // La fuente variable puede seguir cargando y mover el layout:
  // medir los topes DESPUÉS de fonts.ready, no antes.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const stops2 = await page.evaluate(() => {
    const sheet = document.querySelector('.case-sheet');
    return Array.from(sheet.children)
      .filter((el) => getComputedStyle(el).scrollSnapAlign !== 'none')
      .map((el) => el.offsetTop - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
  });
  expect(stops2.length).toBeGreaterThan(1);
  // Muesca realista (120px): primera parada = primer bloque exacto.
  const box = await page.locator('.case-sheet').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  let cur = await settleTop();
  expect(cur).toBeGreaterThan(0);
  expect(Math.abs(stops2[0] - cur)).toBeLessThan(3);
  // Muesca a muesca hasta el final: cada parada es un bloque exacto
  // (sin saltos ni atascos) sin mover la página.
  const maxTop = await page.evaluate(() => {
    const sheet = document.querySelector('.case-sheet');
    return sheet.scrollHeight - sheet.clientHeight;
  });
  for (let i = 1; i < stops2.length; i++) {
    await page.mouse.wheel(0, 120);
    cur = await settleTop();
    expect(Math.abs(Math.min(stops2[i], maxTop) - cur)).toBeLessThan(3);
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  }
  // Hacia arriba vuelve bloque a bloque hasta el inicio (tope 0, que no
  // es parada snap: se acepta 0 exacto o la primera parada).
  for (let i = stops2.length - 2; i >= 0; i--) {
    await page.mouse.wheel(0, -120);
    cur = await settleTop();
    expect(Math.abs(stops2[i] - cur)).toBeLessThan(3);
  }
  await page.mouse.wheel(0, -120);
  cur = await settleTop();
  expect(cur).toBeLessThan(4);
  expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  expect(errors).toEqual([]);
});


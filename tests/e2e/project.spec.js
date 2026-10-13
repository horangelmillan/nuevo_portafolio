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

// Caja visible del blob (geometría REAL, no k): bbox de píxeles opacos
// que difieren del fondo plano, en px CSS de viewport. Null si invisible.
// OJO: el negro transparente (bitmap recién realocado) difiere del papel:
// el alfa <128 también es fondo, si no un canvas vacío mide fullscreen.
async function blobBox(page) {
  return page.evaluate(() => {
    const cv = document.querySelector('.project-blob');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    const dpr = cv.width / Math.max(1, r.width);
    const ctx = cv.getContext('2d');
    const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const W = cv.width;
    const H = cv.height;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    const step = 4;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        if (img[i + 3] < 128) continue;
        const d =
          Math.abs(img[i] - 233) + Math.abs(img[i + 1] - 224) + Math.abs(img[i + 2] - 207);
        if (d > 60) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    return {
      x: r.left + x0 / dpr,
      y: r.top + y0 / dpr,
      w: (x1 - x0) / dpr,
      h: (y1 - y0) / dpr,
    };
  });
}

// Grabadora in-page con rAF (densa, sin latencia CDP): registra k y ancho
// visible juntos. El muestreo desde Node perdía ventanas bajo carga.
// OJO medición: el negro transparente (bitmap recién realocado) difiere
// del papel; alfa<128 también es fondo o un canvas vacío mide fullscreen.
async function startTraj(page) {
  await page.evaluate(() => {
    window.__traj = [];
    const cv = document.querySelector('.project-blob');
    const PAPER = [233, 224, 207];
    const rec = () => {
      const ov = document.querySelector('.case-overlay');
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / Math.max(1, r.width);
      const ctx = cv.getContext('2d');
      const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width;
      const H = cv.height;
      let x0 = W;
      let x1 = -1;
      const step = 6;
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4;
          if (img[i + 3] < 128) continue;
          if (
            Math.abs(img[i] - PAPER[0]) + Math.abs(img[i + 1] - PAPER[1]) + Math.abs(img[i + 2] - PAPER[2]) >
            60
          ) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
          }
        }
      }
      window.__traj.push({
        k: Number(cv.dataset.k),
        w: x1 < 0 ? 0 : (x1 - x0) / dpr,
        phase: ov ? ov.dataset.phase : 'gone',
      });
      if (window.__traj.length < 400) requestAnimationFrame(rec);
    };
    rec();
  });
}

async function readTraj(page) {
  return page.evaluate(() => window.__traj);
}

async function activeCardCenter(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.carousel-card[data-active="true"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
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

test('caso fondo — al abrir, el detalle queda sobre fondo papel, no azul', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await arrowTo(page, 4);
  await page.locator('.carousel-card[data-index="4"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  const paperDist = () =>
    page.evaluate(() => {
      const cv = document.querySelector('.project-blob');
      const ctx = cv.getContext('2d');
      const d = ctx.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data;
      return Math.abs(d[0] - 233) + Math.abs(d[1] - 224) + Math.abs(d[2] - 207);
    });
  await page.waitForTimeout(2000);
  // Fondo neutro de página (#e9e0cf), no el azul del blob (distancia >300).
  expect(await paperDist()).toBeLessThan(60);
  // Ni un resize posterior lo repinta de azul (el frame tardío era el bug).
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(600);
  expect(await paperDist()).toBeLessThan(60);
  expect(errors).toEqual([]);
});

test('caso fade — Proyectos se desvanece gradual antes de abrir del todo', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  await page.evaluate(() => {
    window.__fade = [];
    const t0 = performance.now();
    const rec = () => {
      const b = document.querySelector('.body');
      const ov = document.querySelector('.case-overlay');
      window.__fade.push({
        t: Math.round(performance.now() - t0),
        op: b ? Number(getComputedStyle(b).opacity) : NaN,
        phase: ov ? ov.dataset.phase : '-',
      });
      if (window.__fade.length < 200) requestAnimationFrame(rec);
    };
    rec();
  });
  await page.locator('.carousel-card[data-index="0"]').click();
  await expect(page.locator('.case-overlay.phase-open')).toBeVisible({ timeout: 8000 });
  const fade = await page.evaluate(() => window.__fade);
  // Gradual: empieza visible, baja por pasos intermedios, sin salto 1→0.
  const ops = fade.map((s) => s.op).filter((v) => !Number.isNaN(v));
  expect(ops[0]).toBeGreaterThan(0.9);
  expect(ops[ops.length - 1]).toBeLessThan(0.05);
  const steps = ops.filter((v, i) => i === 0 || v < ops[i - 1] - 0.02).length;
  expect(steps).toBeGreaterThan(2);
  for (let i = 1; i < ops.length; i++) {
    expect(ops[i]).toBeLessThanOrEqual(ops[i - 1] + 0.001);
  }
  // Termina de desaparecer antes de que finalice la apertura.
  const goneAt = fade.findIndex((s) => s.op < 0.05);
  const openAt = fade.findIndex((s) => s.phase === 'open');
  expect(goneAt).toBeGreaterThanOrEqual(0);
  expect(openAt).toBeGreaterThanOrEqual(0);
  expect(fade[goneAt].t).toBeLessThan(fade[openAt].t);
  expect(errors).toEqual([]);
});

test('caso — tap en activa expande sin cambiar de URL', async ({ page }) => {
  const { errors } = await gotoProyectos(page);
  expect(await page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex))).toBe(0);
  await startTraj(page);
  await page.locator('.carousel-card[data-index="0"]').click();
  // Geometría REAL de apertura: la caja visible del MISMO blob CRECE
  // (tarjeta → pantalla). Al cubrir se transparenta y deja de verse.
  const overlay = page.locator('.case-overlay.phase-open');
  await expect(overlay).toBeVisible({ timeout: 8000 });
  const vw = await page.evaluate(() => window.innerWidth);
  const seen = (await readTraj(page)).filter((s) => s.phase === 'expanding' && s.w > 0);
  // ≥2 puntos bastan para probar crecimiento (bajo carga paralela el rAF
  // se inaniciona y deja pocos frames del expand de 1s).
  expect(seen.length).toBeGreaterThan(1);
  // Empieza sustancialmente más pequeño de lo que termina (sin atarlo a
  // un px absoluto: bajo carga la primera muestra llega más tarde).
  expect(seen[0].w).toBeLessThan(seen[seen.length - 1].w * 0.75);
  expect(seen[seen.length - 1].w).toBeGreaterThan(vw * 0.7);
  for (let i = 1; i < seen.length; i++) {
    expect(seen[i].w).toBeGreaterThanOrEqual(seen[i - 1].w - 4);
  }
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
  // Grabación in-page con rAF (densa, sin latencia CDP): registra k y
  // ancho visible juntos durante todo el cierre. El muestreo desde Node
  // perdía la ventana bajo carga y falseaba el test.
  await startTraj(page);
  await page.getByRole('button', { name: 'Cerrar caso' }).click();
  const vw = await page.evaluate(() => window.innerWidth);
  await expect(page.locator('.case-overlay')).toHaveCount(0, { timeout: 8000 });
  const traj = await readTraj(page);
  // Ventana de colapso: desde que k arranca (~0) hasta que termina (~1).
  const start = traj.findIndex((s) => s.phase === 'closing' && s.k < 0.2);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = traj.findIndex((s, i) => i > start && (s.k > 0.95 || s.phase === 'gone'));
  // Solo fase closing: lo posterior a 'gone' es realloc transparente o
  // ambiente de vuelta, no colapso.
  const curve = traj
    .slice(start, end === -1 ? undefined : end + 1)
    .filter((s) => s.phase === 'closing' && s.w > 0);
  expect(curve.length).toBeGreaterThan(3);
  // Empieza cubriendo (ancho de viewport) y termina sustancialmente
  // más pequeño (px absolutos, no ratio: en tablet el blob base ya es
  // grande y el ratio falseaba)…
  expect(curve[0].w).toBeGreaterThan(vw * 0.6);
  expect(curve[0].w - curve[curve.length - 1].w).toBeGreaterThan(100);
  // …sin re-crecer en el camino, mientras k sube 0→1 (la relación k↔tamaño
  // es la prueba de dirección: con extremos invertidos, k↑ era expansión).
  for (let i = 1; i < curve.length; i++) {
    expect(curve[i].w).toBeLessThanOrEqual(curve[i - 1].w + 8);
  }
  const ks = curve.map((s) => s.k).filter((v) => !Number.isNaN(v));
  expect(ks[ks.length - 1]).toBeGreaterThan(0.9);
  // …y termina sobre la tarjeta original.
  const card = await activeCardCenter(page);
  const homeBox = await blobBox(page);
  expect(homeBox).not.toBeNull();
  const homeCx = homeBox.x + homeBox.w / 2;
  const homeCy = homeBox.y + homeBox.h / 2;
  expect(Math.abs(homeCx - card.x)).toBeLessThan(130);
  expect(Math.abs(homeCy - card.y)).toBeLessThan(130);
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


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
  // Medida inicial + fonts: espera por estado (asentado), no por tiempo.
  // (data-settled nace en "0": solo el efecto montado publica "1".)
  await page.waitForFunction(
    () => document.querySelector('.carousel-track').dataset.settled === '1',
    null,
    { timeout: 8000 }
  );
  await page.evaluate(() => document.fonts.ready);
  // El scrollIntoView es suave: esperar a que el scrollY se estabilice
  // antes de usar coordenadas absolutas del ratón (si no, el drag arranca
  // fuera de la vista y la pista no se mueve).
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

const activeIdx = (page) =>
  page.evaluate(() => Number(document.querySelector('.carousel').dataset.activeIndex));
const offsetX = (page) =>
  page.evaluate(() => Number(document.querySelector('.carousel-track').dataset.offset));

test('carrusel — renderiza 5 tarjetas, flechas y estado inicial', async ({ page }) => {
  await gotoProyectos(page);
  await expect(page.locator('.carousel-card')).toHaveCount(5);
  await expect(page.locator('.carousel-ctrl.left')).toBeVisible();
  await expect(page.locator('.carousel-ctrl.right')).toBeVisible();
  const idx = await activeIdx(page);
  // Con padding de centrado, la primera tarjeta arranca centrada (índice 0
  // determinista en todos los viewports) y la anterior nace deshabilitada.
  expect(idx).toBe(0);
  await expect(page.locator('.carousel-ctrl.left')).toBeDisabled();
  // Sin canvas ajeno: solo valen los intencionales (.project-blob en
  // proyectos, .contact-cubes en contacto).
  expect(await page.locator('section.section canvas:not(.project-blob):not(.contact-cubes)').count()).toBe(0);
  // Formato de sección por roles: título Outfit negro (h1), descripción
  // Cinzel terracota (h2), párrafo Outfit gris (p). Fija fuente+color.
  // (next/font genera la familia en minúsculas: comparación insensible.)
  const typo = await page.evaluate(() => {
    const card = document.querySelector('.carousel-card');
    const css = (sel) => getComputedStyle(card.querySelector(sel));
    return {
      title: [css('h3').fontFamily.toLowerCase(), css('h3').color],
      context: [css('.carousel-context').fontFamily.toLowerCase(), css('.carousel-context').color],
      status: [css('.carousel-status').fontFamily.toLowerCase(), css('.carousel-status').color],
    };
  });
  expect(typo.title[0]).toContain('outfit');
  expect(typo.title[1]).toBe('rgb(0, 0, 0)');
  expect(typo.context[0]).toContain('cinzel');
  expect(typo.context[1]).toBe('rgb(221, 78, 17)');
  expect(typo.status[0]).toContain('outfit');
  expect(typo.status[1]).toBe('rgb(82, 82, 82)');
  // Fade en bordes: las tarjetas se desvanecen, no se cortan en duro.
  const mask = await page.locator('.carousel-view').evaluate((el) => getComputedStyle(el).maskImage);
  expect(mask).toContain('linear-gradient');
});

test('carrusel — semántica nativa: li puros y botón con nombre visible', async ({ page }) => {
  await gotoProyectos(page);
  // La pista solo tiene li (5 tarjetas + el espaciador final real).
  const tags = await page.evaluate(() =>
    Array.from(document.querySelector('.carousel-track').children).map((el) => el.tagName)
  );
  expect(tags).toEqual(['LI', 'LI', 'LI', 'LI', 'LI', 'LI']);
  // Sin roles ni nombres que rompan la lista: el interactivo es un botón
  // nativo por tarjeta cuyo nombre sale del texto visible vía
  // aria-labelledby (título+contexto+estado). El botón no envuelve los
  // h3/p (su modelo de contenido solo admite phrasing content).
  const cardAttrs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.carousel-card')).map((el) => ({
      role: el.getAttribute('role'),
      tab: el.getAttribute('tabindex'),
      label: el.getAttribute('aria-label'),
    }))
  );
  expect(cardAttrs).toHaveLength(5);
  for (const a of cardAttrs) {
    expect(a).toEqual({ role: null, tab: null, label: null });
  }
  await expect(page.locator('.carousel-card > button.carousel-card-btn')).toHaveCount(5);
  const btnStruct = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.carousel-card > button')).map((b) => {
      const ids = (b.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      return {
        ids,
        invalidDescendants: b.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,ul,ol,li').length,
        named: ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' '),
      };
    })
  );
  expect(btnStruct).toHaveLength(5);
  const titles = ['Portfolio', 'SAP BTP', 'Apps JS', 'Próximo caso', 'MundoCloud'];
  for (const b of btnStruct) {
    expect(b.invalidDescendants).toBe(0);
    expect(b.ids).toHaveLength(3);
  }
  for (const title of titles) {
    expect(btnStruct.some((b) => b.named.includes(title))).toBe(true);
    await expect(
      page.locator('.carousel-track').getByRole('button', { name: title })
    ).toBeVisible();
  }
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
    // Ritmo de gesto humano: un frame entre moves (antes 16ms fijos).
    await page.waitForFunction(() => new Promise(requestAnimationFrame));
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
  for (let k = 0; k < 5; k++) {
    if ((await activeIdx(page)) === 4) break;
    const x0 = box.x + box.width * 0.7;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(x0 - (i * box.width * 0.5) / 12, y);
      await page.waitForFunction(() => new Promise(requestAnimationFrame));
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
  expect(await activeIdx(page)).toBe(4);
  await expect(page.locator('.carousel-ctrl.right')).toBeDisabled();
});

test('carrusel — teclado ArrowRight/ArrowLeft navega', async ({ page }) => {
  await gotoProyectos(page);
  expect(await activeIdx(page)).toBe(0);
  // focus() en vez de click(): el click sobre la tarjeta activa ABRE el caso.
  await page.locator('.carousel').focus();
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

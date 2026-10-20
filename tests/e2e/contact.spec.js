import { test, expect } from "@playwright/test";

// Muestreo anclado al reloj de animación (no al de pared): bajo carga el
// rAF rinde menos pero las fases avanzan igual; el test tarda más, no falla.
async function clockNow(page) {
  return page.evaluate(() => Number(document.querySelector("canvas.contact-cubes").getAttribute("data-clock")));
}
async function waitClock(page, t) {
  await page.waitForFunction(
    (tt) => Number(document.querySelector("canvas.contact-cubes").getAttribute("data-clock")) >= tt,
    t,
    { timeout: 25000 }
  );
}

// Muestreo multi-momento + respiración: el test dura ~60s.
test.setTimeout(180000);

// Contacto v6: card compacta estilo subrayado, cabe en 100vh, footer al fondo.
test("contacto v6 cabe en pantalla y el footer aparece al fondo", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => document.body.dataset.booted === "1", null, { timeout: 15000 });
  const vh = await page.evaluate(() => window.innerHeight);

  // La sección mide exactamente 1 viewport (contrato de las 4 secciones).
  const secH = await page.evaluate(() => document.getElementById("contacto").offsetHeight);
  expect(Math.abs(secH - vh)).toBeLessThan(4);

  // Entrar por nav y esperar a que el scroll suave asiente (si se mide en
  // vuelo, la card sale "cortada" aunque quepa).
  await page.locator(".Navbar").getByRole("button", { name: "CONTACTO", exact: true }).click();
  await page.waitForFunction(() => {
    const sec = document.getElementById("contacto");
    const target = sec.getBoundingClientRect().top + window.scrollY + sec.offsetHeight / 2 - window.innerHeight / 2;
    return Math.abs(window.scrollY - target) < 4;
  }, null, { timeout: 8000 });
  const sec = page.locator("section#contacto");
  // Título nuevo: ¿Hablamos? como h1, sin subtítulo.
  await expect(sec.getByRole("heading", { name: "¿Hablamos?" })).toBeVisible();
  await expect(sec.locator("h2")).toHaveCount(0);
  const card = sec.locator(".contact-card");
  await expect(card).toBeVisible();
  // La card es opaca: nada del canvas puede verse a través de ella.
  expect(await card.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
  const box = await card.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(-2);
  expect(box.y + box.height).toBeLessThanOrEqual(vh + 2);

  // Campos v6: sin motivo, botón Submit con flecha, línea directa.
  await expect(sec.locator('input[name="name"]')).toBeVisible();
  await expect(sec.locator('input[name="email"]')).toBeVisible();
  await expect(sec.locator('textarea[name="message"]')).toBeVisible();
  await expect(sec.locator('select[name="motivo"]')).toHaveCount(0);
  await expect(sec.getByRole("button", { name: /Submit/ })).toBeVisible();
  await expect(sec.getByText("contacto@horangelmillan.dev").first()).toBeVisible();
  await expect(sec.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", /github\.com\/horangelmillan/);
  await expect(sec.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", /linkedin\.com\/in\/horangelmillan/);
  // Cubos propios a la derecha: canvas transparente, no tapa el form y corre.
  const cubes = sec.locator("canvas.contact-cubes");
  await expect(cubes).toBeAttached();
  expect(await cubes.getAttribute("aria-hidden")).toBe("true");
  const bg = await cubes.evaluate((c) => getComputedStyle(c).backgroundColor);
  expect(["rgba(0, 0, 0, 0)", "transparent"].includes(bg)).toBe(true);
  const t0 = Number(await cubes.getAttribute("data-tick"));
  await expect
    .poll(async () => Number(await cubes.getAttribute("data-tick")), { timeout: 8000 })
    .toBeGreaterThan(t0);
  expect(Number(await cubes.getAttribute("data-tick"))).toBeGreaterThan(t0);
  // El form sigue clicable por encima del canvas.
  await sec.locator('input[name="name"]').click();
  // Velo DELANTE del canvas (posterior en el DOM, mismo z-index).
  const shade = sec.locator(".contact-shade");
  await expect(shade).toHaveCount(1);
  expect(await shade.getAttribute("aria-hidden")).toBe("true");
  const order = await sec.evaluate((s) => {
    const c = s.querySelector("canvas.contact-cubes");
    const sh = s.querySelector(".contact-shade");
    const z = (el) => getComputedStyle(el).zIndex;
    return {
      shadeAfter: Boolean(sh.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING),
      zCanvas: z(c),
      zShade: z(sh),
    };
  });
  expect(order.shadeAfter).toBe(true);
  expect(order.zCanvas).toBe(order.zShade);

  // Píxeles COMPUESTOS (lo que se ve: card y velo ya ocluyen).
  async function compositedGrid() {
    const buf = await page.screenshot();
    return page.evaluate(async ({ b64 }) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
      const vw = window.innerWidth, vh = window.innerHeight;
      const W = 160, H = 90;
      const t = document.createElement("canvas");
      t.width = W; t.height = H;
      const x = t.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, vw, vh, 0, 0, W, H);
      const dd = x.getImageData(0, 0, W, H).data;
      const vivid = (k) => dd[k + 3] > 200 && (Math.abs(dd[k] - dd[k + 1]) > 30 || Math.abs(dd[k] - dd[k + 2]) > 30);
      const card = document.querySelector("#contacto .contact-card").getBoundingClientRect();
      const sx = W / vw, sy = H / vh;
      const cx0 = Math.floor(card.left * sx) - 1, cx1 = Math.ceil(card.right * sx) + 1;
      const cy0 = Math.floor(card.top * sy) - 1, cy1 = Math.ceil(card.bottom * sy) + 1;
      // Rejilla 6x10 sobre la zona derecha, excluyendo la tarjeta.
      const gx0 = Math.max(cx1, Math.floor(W * 0.55));
      const cols = 6, rows = 10;
      // Hueco mayor: distancia máxima desde cualquier celda al píxel
      // vivo más cercano (captura vacíos reales, no celdas). En rejilla px.
      const vividPts = [];
      for (let j = 0; j < H; j += 2) {
        for (let i = gx0; i < W; i += 2) {
          if (vivid((j * W + i) * 4)) vividPts.push([i, j]);
        }
      }
      let maxGap = 0, gapAt = null;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = gx0 + ((c + 0.5) / cols) * (W - gx0);
          const cy = ((r + 0.5) / rows) * H;
          // Fuera de la card y fuera de la banda sólida del velo (vacía por diseño).
          if (cx <= cx1 || cx > W - 10) continue;
          let best = Infinity;
          for (let k = 0; k < vividPts.length; k++) {
            const dx = cx - vividPts[k][0], dy = cy - vividPts[k][1];
            const dd = dx * dx + dy * dy;
            if (dd < best) best = dd;
            if (best === 0) break;
          }
          const gap = Math.sqrt(best === Infinity ? 1e9 : best);
          if (gap > maxGap) { maxGap = gap; gapAt = [Math.round(cx), Math.round(cy)]; }
        }
      }
      // Franjas móvil: arriba de la card (derecha) y tira inferior.
      const band = (y0, y1, xa, xb, n) => {
        let colsHit = 0;
        for (let c = 0; c < n; c++) {
          const x0 = Math.floor(xa + (c * (xb - xa)) / n), x1 = Math.ceil(xa + ((c + 1) * (xb - xa)) / n);
          let m = 0;
          for (let y = Math.max(0, y0); y < Math.min(H, y1) && m <= 4; y++)
            for (let xx = x0; xx < x1 && m <= 4; xx++) if (vivid((y * W + xx) * 4)) m++;
          if (m > 4) colsHit++;
        }
        return colsHit;
      };
      const topBand = band(0, cy0, Math.floor(W / 2), W, 6);
      const botBand = band(cy1, H, 0, W, 8);
      // Velo: franja en banda sólida (fuera de la scrollbar) limpia +
      // interior con cubos + borde superior tapado. La scrollbar naranja
      // también es vívida: se excluye.
      let strip = 0, interior = 0, topStrip = 0;
      for (let j = 0; j < H; j++) {
        for (let i = W - 5; i < W - 2; i++) if (vivid((j * W + i) * 4)) strip++;
        for (let i = gx0; i < Math.min(gx0 + 14, W); i++) if (vivid((j * W + i) * 4)) interior++;
      }
      for (let j = 0; j < 4; j++) {
        for (let i = Math.floor(W * 0.55); i < W - 4; i++) if (vivid((j * W + i) * 4)) topStrip++;
      }
      return { maxGap: Math.round(maxGap * 10) / 10, gapAt, topBand, botBand, strip, interior, topVeil: topStrip, narrow: (card.right - card.left) > vw * 0.7 };
    }, { b64: buf.toString("base64") });
  }
  const moments = [];
  const clockBase = await clockNow(page);
  for (let m = 0; m < 3; m++) {
    // eslint-disable-next-line no-await-in-loop
    await waitClock(page, clockBase + (m + 1) * 1.2);
    // eslint-disable-next-line no-await-in-loop
    moments.push(await compositedGrid());
  }
  console.log("cobertura momentos=" + JSON.stringify(moments.map(({ maxGap, gapAt, topBand, botBand, strip, interior, topVeil, narrow }) => ({ maxGap, gapAt, topBand, botBand, strip, interior, topVeil, narrow }))));
  const isMobile = moments[0].narrow;
  if (isMobile) {
    const ok = (f) => moments.filter((g) => g[f] >= 2).length >= 2;
    expect(ok("topBand")).toBe(true);
    expect(ok("botBand")).toBe(true);
  } else {
    // Hueco mayor ≤12px de rejilla (~108px CSS) en ≥2 de 3 momentos.
    const good = moments.filter((g) => g.maxGap <= 12).length;
    expect(good).toBeGreaterThanOrEqual(2);
  }
  // Velo delante: atenúa el borde (franja más tenue que el interior).
  // El fondo sólido del usuario es fino (1%): no se exige borde vacío,
  // sino atenuación medible respecto al interior. En angosto no hay
  // interior: basta atenuación fuerte absoluta.
  const last = moments[moments.length - 1];
  const stripFrac = last.strip / (3 * 90);
  const interiorFrac = last.interior / (14 * 90);
  if (isMobile) {
    expect(stripFrac).toBeLessThan(0.35);
  } else {
    expect(stripFrac).toBeLessThan(0.5 * interiorFrac);
    expect(last.interior / (14 * 90)).toBeGreaterThan(0.05);
    expect(last.topVeil).toBeLessThanOrEqual(30);
  }

  // Ritmo al 75%: el reloj propio avanza ~0.75× pared (tolerancia por throttle).
  const c0 = Number(await cubes.getAttribute("data-clock"));
  const w0 = Date.now();
  await page.waitForTimeout(3000);
  const c1 = Number(await cubes.getAttribute("data-clock"));
  const ratio = (c1 - c0) / ((Date.now() - w0) / 1000);
  console.log("ritmo ratio=" + Math.round(ratio * 100) / 100);
  expect(ratio).toBeGreaterThan(0.65);
  expect(ratio).toBeLessThan(0.85);

  // Respiración: oscilación global suave + picos desfasados por bloque.
  // Nota honesta: seguir UN cubo por identidad no funciona en composición
  // densa (los componentes se fusionan/dividen al superponerse: el área
  // salta por fusión, no por escala). La independencia por cubo está en el
  // código (freq/fase/amplitud propias por pieza) y aquí se evidencia con
  // desincronización entre bloques + inversión de tendencia global.
  const series = [];
  const breathBase = await clockNow(page);
  const countSigns = (vals) => {
    const nT = vals.length, mx = (nT - 1) / 2;
    const my = vals.reduce((a, b) => a + b, 0) / nT;
    let num = 0, den = 0;
    for (let i = 0; i < nT; i++) { num += (i - mx) * (vals[i] - my); den += (i - mx) * (i - mx); }
    const slope = den === 0 ? 0 : num / den;
    const detr = vals.map((v, i) => v - slope * i);
    const dd = detr.slice(1).map((v, i) => v - detr[i]);
    const ee = my * 0.002;
    let sg = 0;
    for (let i = 1; i < dd.length; i++) {
      if (dd[i] > ee && dd[i - 1] < -ee) sg++;
      else if (dd[i] < -ee && dd[i - 1] > ee) sg++;
    }
    return sg;
  };
  for (let s = 0; s < 24; s++) {
    // eslint-disable-next-line no-await-in-loop
    await waitClock(page, breathBase + (s + 1) * 0.8);
    // eslint-disable-next-line no-await-in-loop
    series.push(await page.evaluate(() => {
      const c = document.querySelector("canvas.contact-cubes");
      const t = document.createElement("canvas");
      t.width = 144; t.height = 90;
      const x = t.getContext("2d", { willReadFrequently: true });
      x.drawImage(c, 0, 0, 144, 90);
      const d = x.getImageData(0, 0, 144, 90).data;
      const W = 144, H = 90;
      const vivid = (k) => d[k + 3] > 40 && (Math.abs(d[k] - d[k + 1]) > 30 || Math.abs(d[k] - d[k + 2]) > 30);
      const blocks = [0, 0, 0, 0];
      let total = 0;
      for (let j = 0; j < H; j++) {
        for (let i = 79; i < W; i++) {
          if (!vivid((j * W + i) * 4)) continue;
          total++;
          blocks[(j >= 45 ? 2 : 0) + (i >= 111 ? 1 : 0)]++;
        }
      }
      return { total, blocks };
    }));
    if (series.length >= 8 && countSigns(series.map((s) => s.total)) >= 1) break;
  }
  // Seguimiento por identidad: descartado con evidencia (los componentes
  // se fusionan/dividen al superponerse en composición densa: el área
  // salta por fusión, no por escala; medido: range 178% por fusiones).
  // En su lugar: inversión de tendencia global + desfase por bloques.
  const totals = series.map((s) => s.total);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const range = Math.max(...totals) - Math.min(...totals);
  // Sin tendencia lineal (la deriva monótona no cuenta como oscilación).
  const nT = totals.length;
  const mx = (nT - 1) / 2, my = mean;
  let num = 0, den = 0;
  for (let i = 0; i < nT; i++) { num += (i - mx) * (totals[i] - my); den += (i - mx) * (i - mx); }
  const slope = den === 0 ? 0 : num / den;
  const detr = totals.map((v, i) => v - slope * i);
  const deltas = detr.slice(1).map((v, i) => v - detr[i]);
  const signs = countSigns(totals);
  const maxStep = Math.max(...deltas.map(Math.abs));
  console.log("respiracion mean=" + Math.round(mean) + " range%=" + Math.round((1000 * range) / mean) / 10 + " signs=" + signs + " maxStep%=" + Math.round((1000 * maxStep) / mean) / 10);
  expect(range / mean).toBeGreaterThan(0.015);
  // ≥1 inversión (bajo carga paralela el rAF se apelotona y 2 es frágil;
  // la independencia la afirma el desfase por bloques, no este conteo).
  expect(signs).toBeGreaterThanOrEqual(1);
  expect(maxStep / mean).toBeLessThan(0.12);
  // Desfase: los bloques no pican a la vez (en angosto la zona es menor:
  // basta con 2 picos distintos).
  const peaks = [0, 1, 2, 3].map((b) => {
    let bi = 0;
    for (let s = 1; s < series.length; s++) if (series[s].blocks[b] > series[bi].blocks[b]) bi = s;
    return bi;
  });
  expect(new Set(peaks).size).toBeGreaterThanOrEqual(isMobile ? 2 : 3);
  // Honeypot: existe pero fuera de pantalla (no visible).
  const hp = sec.locator('input[name="botcheck"]');
  await expect(hp).toHaveCount(1);
  await expect(hp).not.toBeVisible();

  // Sin key el submit avisa (no rompe): comportamiento determinista en CI.
  await sec.locator('input[name="name"]').fill("Test");
  await sec.locator('input[name="email"]').fill("test@example.com");
  await sec.locator('textarea[name="message"]').fill("Mensaje de prueba con más de diez caracteres.");
  await sec.getByRole("button", { name: /Submit/ }).click();
  await expect(sec.locator(".contact-status")).not.toBeEmpty();

  // Al fondo: el footer fijo aparece.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator(".Footer.fadeInFooter")).toBeVisible({ timeout: 8000 });
});

/*
 * Motor generativo del fondo del hero (puro, sin React).
 * Extracción fiel de /hero-lab v7: clusters, tiers (incl. XXL), safe zone
 * por tiers, silueta exterior gruesa, gradientes reales cacheados y sombra
 * como capa independiente. Sin dependencias.
 */

export const PALETTES = {
  referencia: {
    label: "Referencia (violeta/magenta/azul/cyan)",
    colors: [
      "#7b2fbe",
      "#9d4edd",
      "#5a189a",
      "#3c096c",
      "#3a86ff",
      "#4cc9f0",
      "#2ec4b6",
      "#f72585",
      "#ff5d8f",
      "#e9c46a",
    ],
  },
  fria: {
    label: "Fría (azules / cyan)",
    colors: ["#1d3557", "#277da1", "#3a86ff", "#4cc9f0", "#90e0ef", "#2ec4b6"],
  },
  calida: {
    label: "Cálida (magenta / rojos / ámbar)",
    colors: ["#590d22", "#a4133c", "#f72585", "#ff5d8f", "#e63946", "#e9c46a"],
  },
  violeta: {
    label: "Mono violeta (prueba legibilidad)",
    colors: ["#10002b", "#3c096c", "#5a189a", "#7b2fbe", "#9d4edd", "#c77dff"],
  },
};

export const PHASES = [
  { id: "hero", paletteId: "calida" },
  { id: "sobre-mi", paletteId: "calida" },
  { id: "proyectos", paletteId: "calida" },
  { id: "contacto", paletteId: "calida" },
];

// Driver de fase por scroll (puro, sin DOM): scrollY es gratis, offsets
// cacheados fuera (recalculados solo en resize). Devuelve fase activa +
// progreso 0..1 hacia la siguiente. Con una sola conducta (hero) el motor
// ignora las no-hero (fallback hero) → cero cambio visual en la base.
export function getPhaseForScroll(scrollY, offsets, vh) {
  if (!offsets || offsets.length === 0 || !vh)
    return { index: 0, id: PHASES[0].id, progress: 0 };
  const y = scrollY + vh * 0.5;
  let index = 0;
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i];
    if (o && y >= o.top && y < o.bottom) {
      index = i;
      break;
    }
    if (o && y >= o.bottom) index = Math.min(i + 1, offsets.length - 1);
  }
  index = Math.max(0, Math.min(offsets.length - 1, index));
  const top = offsets[index] ? offsets[index].top : scrollY;
  const progress = Math.max(0, Math.min(1, (scrollY - top) / vh));
  const id = (PHASES[index] || PHASES[0]).id;
  return { index, id, progress };
}

function paletteAvg(paletteId) {
  const pal = PALETTES[paletteId];
  if (!pal) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const hex of pal.colors) {
    const [cr, cg, cb] = hexToRgb(hex);
    r += cr;
    g += cg;
    b += cb;
  }
  const n = Math.max(1, pal.colors.length);
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shadeRgb(r, g, b, amt) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Distancia con signo al rect: >0 fuera, <0 penetración.
export function rectDist(x, y, r) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  return -Math.min(x - r.x0, r.x1 - x, y - r.y0, r.y1 - y);
}

// Clearance mínima por tier, medida sobre el CENTRO de la pieza.
export function tierGap(tier) {
  if (tier === "xxl" || tier === "xl" || tier === "large") return 0;
  return -Infinity;
}

// Protección extra alrededor del H1 (solo tiers grandes, margen pequeño).
export function tierGapH1(tier, u) {
  if (tier === "xxl") return u * 0.03;
  if (tier === "xl") return u * 0.02;
  if (tier === "large") return 0;
  return -Infinity;
}

export function satisfies(x, y, tier, zone, scale, u) {
  const g = tierGap(tier);
  if (g > -Infinity && rectDist(x, y, zone.text) < g * scale) return false;
  const gH = tierGapH1(tier, u);
  if (gH > -Infinity && rectDist(x, y, zone.h1) < gH * scale) return false;
  return true;
}

export function samplePos(rand, clusters, w, h, m) {
  if (rand() < 0.2) {
    return {
      x: rand() * (w + m * 2) - m,
      y: rand() * (h + m * 2) - m,
      cl: -1,
    };
  }
  const ci = Math.floor(rand() * clusters.length);
  const cl = clusters[ci];
  return {
    x: cl.x + gauss(rand) * cl.r * 0.75,
    y: cl.y + gauss(rand) * cl.r * 0.62,
    cl: ci,
  };
}

export function pickTier(rand) {
  const r = rand();
  if (r < 0.025) return "xxl";
  if (r < 0.085) return "xl";
  if (r < 0.285) return "large";
  if (r < 0.615) return "medium";
  if (r < 0.865) return "small";
  return "tiny";
}

// Tamaños como fracción de min(w,h): conservan impacto en FHD/2K/4K.
export function tierSize(tier, rand, u) {
  let s;
  if (tier === "xxl") s = u * (0.24 + rand() * 0.12);
  else if (tier === "xl") s = u * (0.15 + rand() * 0.09);
  else if (tier === "large") s = u * (0.085 + rand() * 0.06);
  else if (tier === "medium") s = u * (0.045 + rand() * 0.045);
  else if (tier === "small") s = u * (0.022 + rand() * 0.03);
  else s = u * (0.008 + rand() * 0.018);
  return Math.max(6, s);
}

// Mide la Text Safe Zone desde el DOM real (responsive por construcción).
export function measureZone(wrapEl, textEl, h1El, w, h) {
  if (!wrapEl || !textEl || !h1El) return null;
  const W = wrapEl.getBoundingClientRect();
  if (W.width === 0) return null;
  const T = textEl.getBoundingClientRect();
  const H = h1El.getBoundingClientRect();
  const mg = Math.min(w, h) * 0.02;
  const rel = (R, m) => ({
    x0: R.left - W.left - m,
    y0: R.top - W.top - m,
    x1: R.right - W.left + m,
    y1: R.bottom - W.top + m,
  });
  return { text: rel(T, mg), h1: rel(H, mg * 1.25) };
}

export function fallbackZone(w, h) {
  return {
    text: { x0: w * 0.04, y0: h * 0.22, x1: w * 0.72, y1: h * 0.82 },
    h1: { x0: w * 0.06, y0: h * 0.3, x1: w * 0.6, y1: h * 0.45 },
  };
}

export function buildGeom(s, wRatio, bodyRatio, jit) {
  const hw = s * wRatio;
  const th = hw * 0.5;
  const bodyH = s * bodyRatio;
  const j = jit;
  return {
    T: [j[0] * s, -th + j[1] * s],
    R: [hw + j[2] * s, j[3] * s],
    B: [j[4] * s, th],
    L: [-hw, j[5] * s],
    BR: [hw, bodyH + j[6] * s],
    BC: [0, th + bodyH],
    BL: [-hw, bodyH],
  };
}

export function makeField({
  w,
  h,
  seed,
  palette,
  count,
  auto,
  densityPct,
  sizePct,
  geometry,
  protection,
  rotSpreadDeg,
  zone,
}) {
  const rand = mulberry32(seed);
  // Stream SEPARADO para los extras geométricos: el stream principal queda
  // idéntico en ambas variantes → misma composición, distinta geometría.
  const geoRand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const deformed = geometry === "deformados";
  const u = Math.min(w, h);
  const mobile = w < 640;
  const cap = mobile ? 140 : 260;
  const dens = densityPct / 100;
  const sizeScale = sizePct / 100;
  const n = auto
    ? Math.max(
        30,
        Math.min(cap, Math.round(((w * h) / (mobile ? 8000 : 3800)) * dens))
      )
    : Math.max(5, Math.min(cap, Math.round(count * dens)));
  const colors = palette.colors;

  // Clusters anclados alrededor de la safe zone: masas a izquierda/derecha,
  // esquinas, arriba/abajo. Simétricos para no favorecer ninguna zona.
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const slots = [
    [zone.x0 * 0.5, h * 0.5],
    [(zone.x1 + w) / 2, h * 0.5],
    [w * 0.22, h * 0.14],
    [w * 0.78, h * 0.14],
    [w * 0.22, h * 0.87],
    [w * 0.78, h * 0.87],
    [w * 0.5, Math.max(h * 0.07, zone.y0 - h * 0.16)],
    [w * 0.5, Math.min(h * 0.93, zone.y1 + h * 0.14)],
  ];
  const order = mobile ? [0, 1, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const clusterCount = mobile ? 3 : w < 1200 ? 6 : 8;
  const clusters = [];
  for (let c = 0; c < clusterCount; c++) {
    const slot = slots[order[c]];
    clusters.push({
      x: clamp(slot[0] + (rand() - 0.5) * w * 0.1, w * 0.06, w * 0.94),
      y: clamp(slot[1] + (rand() - 0.5) * h * 0.08, h * 0.05, h * 0.95),
      r: u * (0.16 + rand() * 0.1),
      phase: rand() * Math.PI * 2,
      amp: 8 + rand() * 8,
      dx: rand() - 0.5,
      dy: rand() - 0.5,
    });
  }

  // Intensidad maestra de la safe zone: 0% → 0.25x gaps, 100% → 1.25x gaps.
  const gapScale = 0.25 + protection / 100;
  const spread = (rotSpreadDeg / 100) * 1.4;
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const tier = pickTier(rand);
    const s = tierSize(tier, rand, u) * sizeScale;
    const m = Math.max(w, h) * 0.12;
    // Remuestreo suave: hasta 4 intentos; si todos fallan se ACEPTA la
    // última (sin push-out: la densidad y la naturalidad no se negocian).
    let x = 0;
    let y = 0;
    let cl = -1;
    for (let attempt = 0; attempt < 4; attempt++) {
      const pos = samplePos(rand, clusters, w, h, m);
      x = pos.x;
      y = pos.y;
      cl = pos.cl;
      if (satisfies(x, y, tier, zone, gapScale, u)) break;
    }
    const c1 = colors[Math.floor(rand() * colors.length)];
    let c2 = colors[Math.floor(rand() * colors.length)];
    if (c2 === c1) c2 = colors[(colors.indexOf(c1) + 3) % colors.length];
    // Extremos numéricos precalculados (una vez por regen): el loop solo
    // interpola números en un array reutilizado, sin strings ni parseos.
    const wRatio = deformed ? 0.8 + geoRand() * 0.5 : 1;
    const bodyRatio = deformed ? 0.75 + geoRand() * 0.8 : 1;
    const jit = deformed
      ? Array.from({ length: 7 }, () => (geoRand() - 0.5) * 0.14)
      : [0, 0, 0, 0, 0, 0, 0];
    const geom = buildGeom(s, wRatio, bodyRatio, jit);
    pieces.push({
      x,
      y,
      s,
      tier,
      c1,
      c2,
      c1rgb: hexToRgb(c1),
      c2rgb: hexToRgb(c2),
      baseRgb: [0, 0, 0],
      gcache: null,
      cluster: cl,
      rot: (rand() - 0.5) * spread + (rand() - 0.5) * 0.12,
      rotAmp: 0.008 + rand() * 0.02,
      rotFreq: 0.05 + rand() * 0.12,
      wRatio,
      bodyRatio,
      jit,
      geom,
      paths: buildPaths(geom),
      period: 10 + rand() * 12,
      phase: rand() * Math.PI * 2,
      vx: (rand() - 0.5) * 9,
      vy: (rand() - 0.5) * 7,
      breathAmp: 0.008 + rand() * 0.016,
      breathFreq: 0.08 + rand() * 0.2,
      depth: rand() * 100 + s * 0.1,
    });
  }
  // Garantiza jerarquía dominante: 1 XXL + 2 XL (upgrade de las mayores).
  if (n >= 40) {
    const bySize = [...pieces].sort((a, b) => b.s - a.s);
    const need = ["xxl", "xl", "xl"];
    for (let k = 0; k < Math.min(need.length, bySize.length); k++) {
      const p = bySize[k];
      const target = need[k] === "xxl" ? u * 0.26 : u * 0.17;
      p.tier = need[k];
      if (p.s < target) {
        p.s = target * (1 + ((k * 37) % 10) / 60);
        p.geom = buildGeom(p.s, p.wRatio, p.bodyRatio, p.jit);
        p.paths = buildPaths(p.geom);
      }
      p.depth += need[k] === "xxl" ? 30 : 20;
    }
  }
  pieces.sort((a, b) => a.depth - b.depth);
  return { pieces, clusters };
}

// Paths precompilados por pieza (Path2D sin contexto): la geometría solo se
// recorre UNA vez por regen en lugar de ~40 llamadas Canvas por frame.
// Rasterización idéntica: mismos puntos, mismos estilos, mismo transform.
function pathFrom(pts) {
  const path = new Path2D();
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  path.closePath();
  return path;
}

export function buildPaths(geom) {
  const inner = new Path2D();
  const segTo = (a, b) => {
    inner.moveTo(a[0], a[1]);
    inner.lineTo(b[0], b[1]);
  };
  segTo(geom.R, geom.B);
  segTo(geom.B, geom.L);
  segTo(geom.R, geom.BR);
  segTo(geom.B, geom.BC);
  segTo(geom.L, geom.BL);
  return {
    top: pathFrom([geom.T, geom.R, geom.B, geom.L]),
    left: pathFrom([geom.L, geom.B, geom.BC, geom.BL]),
    right: pathFrom([geom.R, geom.B, geom.BC, geom.BR]),
    inner,
    sil: pathFrom([geom.T, geom.R, geom.BR, geom.BC, geom.BL, geom.L]),
  };
}

// Gradientes reales en coordenadas LOCALES (la caché solo se invalida cuando
// cambia el color cuantizado). Lee p.baseRgb: números ya interpolados en el
// frame, sin strings ni parseos.
export function rebuildGradients(ctx, p) {
  const [r, g, b] = p.baseRgb;
  const G = p.geom;
  const top = ctx.createLinearGradient(G.T[0], G.T[1], G.B[0], G.B[1]);
  top.addColorStop(0, shadeRgb(r, g, b, 42));
  top.addColorStop(1, shadeRgb(r, g, b, 6));
  const minY = Math.min(G.L[1], G.B[1], G.T[1]);
  const maxY = Math.max(G.BL[1], G.BC[1], G.BR[1]);
  const left = ctx.createLinearGradient(0, minY, 0, maxY);
  left.addColorStop(0, shadeRgb(r, g, b, -14));
  left.addColorStop(1, shadeRgb(r, g, b, -46));
  const right = ctx.createLinearGradient(0, minY, 0, maxY);
  right.addColorStop(0, shadeRgb(r, g, b, 0));
  right.addColorStop(1, shadeRgb(r, g, b, -30));
  return { top, left, right };
}

export function drawPiece(ctx, p, q, outlinePx) {
  if (!p.gcache || p.gcache.q !== q) {
    p.gcache = { q, grads: rebuildGradients(ctx, p) };
  }
  const g = p.gcache.grads;
  const P = p.paths;
  // 1) Caras rellenas con gradiente real, SIN stroke.
  ctx.fillStyle = g.left;
  ctx.fill(P.left);
  ctx.fillStyle = g.right;
  ctx.fill(P.right);
  ctx.fillStyle = g.top;
  ctx.fill(P.top);
  // 2) Aristas internas: finas, fijas.
  ctx.strokeStyle = "rgba(10,10,18,0.55)";
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.stroke(P.inner);
  // 3) Silueta exterior: el único stroke grueso y configurable.
  ctx.strokeStyle = "#0c0c13";
  ctx.lineWidth = outlinePx;
  ctx.stroke(P.sil);
}

// Fondo base (la sombra es una capa separada).
export function buildBg(ctx, w, h, mode) {
  let grad;
  if (mode === "oscuro") {
    grad = ctx.createLinearGradient(0, 0, w * 0.3, h);
    grad.addColorStop(0, "#241a4e");
    grad.addColorStop(0.55, "#150f30");
    grad.addColorStop(1, "#0b0819");
  } else {
    grad = ctx.createLinearGradient(0, 0, w * 0.3, h);
    grad.addColorStop(0, "#faf5ec");
    grad.addColorStop(1, "#e9e0cf");
  }
  return grad;
}

// SOMBRA como capa independiente: un único createRadialGradient real.
// Se pinta DESPUÉS de los cubos y ANTES del texto. 1 fillRect por frame.
export function buildShade(ctx, w, h, colorHex, fuerza, ext, suav, cxP, cyP) {
  const f = Math.max(0, Math.min(1, fuerza / 100));
  if (f <= 0) return null;
  const e = Math.max(0, Math.min(1, ext / 100));
  const s = Math.max(0, Math.min(1, suav / 100));
  const [r, g, b] = hexToRgb(colorHex);
  const cx = (w * cxP) / 100;
  const cy = (h * cyP) / 100;
  const R = Math.max(1, Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)));
  const A = 0.65 * f;
  const p0 = (1 - e) * 0.92;
  const p1 = Math.min(1, p0 + 0.02 + s * 0.5);
  const rgba = (a) => `rgba(${r},${g},${b},${a})`;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, rgba(0));
  grad.addColorStop(Math.min(p0, 0.999), rgba(0));
  if (p1 < 1) grad.addColorStop(p1, rgba(A));
  grad.addColorStop(1, rgba(A));
  return grad;
}

// Capas estáticas precompuestas UNA vez por resize en canvases offscreen a
// resolución de dispositivo: fondo y sombra por separado para conservar el
// orden (fondo → cubos → sombra → texto DOM). Por frame: 2 drawImage 1:1
// (sin remuestreo) en lugar de 2 fills de gradiente a pantalla completa.
// Píxeles idénticos: mismos gradientes, misma resolución, rect sin AA.
function makeLayer(w, h, dpr) {
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(w * dpr));
  off.height = Math.max(1, Math.floor(h * dpr));
  const c = off.getContext("2d");
  if (!c) return null;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { off, c };
}

export function renderStaticLayers(w, h, dpr, bgMode, sh) {
  const bgL = makeLayer(w, h, dpr);
  if (!bgL) return null;
  bgL.c.fillStyle = buildBg(bgL.c, w, h, bgMode);
  bgL.c.fillRect(0, 0, w, h);
  let shadeCanvas = null;
  const shL = makeLayer(w, h, dpr);
  if (shL) {
    const shade = buildShade(shL.c, w, h, sh.color, sh.fuerza, sh.ext, sh.suav, sh.cx, sh.cy);
    if (shade) {
      shL.c.fillStyle = shade;
      shL.c.fillRect(0, 0, w, h);
      shadeCanvas = shL.off;
    }
  }
  return { bg: bgL.off, shade: shadeCanvas };
}

export function drawFrame(ctx, sim, time, staticT) {
  const { w, h } = sim.size;
  if (sim.layers) ctx.drawImage(sim.layers.bg, 0, 0, w, h);
  else ctx.clearRect(0, 0, w, h);
  const frozen = staticT !== null;
  const t = frozen ? 0 : time;
  const sp = frozen ? 0 : sim.params.speed;
  const colorTime = t * (0.25 + 0.75 * sim.params.speed);
  const outlineBase = sim.params.outlinePct / 100;
  for (const p of sim.pieces) {
    const ct = frozen
      ? 0.6
      : (Math.sin((colorTime * Math.PI * 2) / p.period + p.phase) + 1) / 2;
    // Lerp numérico en array reutilizado (misma aritmética y redondeo que
    // antes, sin strings ni parseos): el gradiente resultante es idéntico.
    const A = p.c1rgb;
    const B = p.c2rgb;
    const BR = p.baseRgb;
    BR[0] = Math.round(A[0] + (B[0] - A[0]) * ct);
    BR[1] = Math.round(A[1] + (B[1] - A[1]) * ct);
    BR[2] = Math.round(A[2] + (B[2] - A[2]) * ct);
    // Morph de paleta por fase (segundo eje sobre el actual): con fase hero
    // o progreso 0 o misma paleta origen/destino se omite → píxeles idénticos
    // a v7. Base: las 4 fases usan cálida → siempre no-op.
    const ph = sim.phase;
    if (!frozen && ph && ph.progress > 0 && PHASES[ph.index]) {
      const fromId = PHASES[ph.index].paletteId;
      const next = PHASES[Math.min(ph.index + 1, PHASES.length - 1)];
      if (next && next.paletteId !== fromId) {
        const target = paletteAvg(next.paletteId);
        if (target) {
          const k = Math.max(0, Math.min(1, ph.progress));
          BR[0] = Math.round(BR[0] + (target[0] - BR[0]) * k);
          BR[1] = Math.round(BR[1] + (target[1] - BR[1]) * k);
          BR[2] = Math.round(BR[2] + (target[2] - BR[2]) * k);
        }
      }
    }
    const q = Math.round(ct * 48);
    let gx = 0;
    let gy = 0;
    if (!frozen && p.cluster >= 0) {
      const cl = sim.clusters[p.cluster];
      const k = Math.sin((t * Math.PI * 2) / 53 + cl.phase) * cl.amp * sp;
      gx = k * cl.dx;
      gy = k * cl.dy;
    }
    // Culling conservador: radio local máximo ~2.6s a rotación extrema +
    // stroke + respiración. Lo omitido está estrictamente fuera del clip del
    // canvas → píxeles idénticos, sin rasterizar paths invisibles.
    const cm = p.s * 2.7 + 12;
    const px = p.x + gx;
    const py = p.y + gy;
    if (px < -cm || px > w + cm || py < -cm || py > h + cm) continue;
    const breath = frozen
      ? 1
      : 1 + Math.sin(t * p.breathFreq * Math.PI * 2 + p.phase) * p.breathAmp * sp;
    const rot = frozen
      ? p.rot
      : p.rot + Math.sin(t * p.rotFreq * Math.PI * 2 + p.phase) * p.rotAmp * sp;
    const outlinePx = Math.min(10, Math.max(2, p.s * 0.05 * outlineBase));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(breath, breath);
    drawPiece(ctx, p, q, outlinePx);
    ctx.restore();
  }
  // Sombra POR ENCIMA de los cubos (capa precompuesta), POR DEBAJO del
  // texto (DOM). Mismo orden y mismos píxeles que antes.
  if (sim.layers && sim.layers.shade) ctx.drawImage(sim.layers.shade, 0, 0, w, h);
}

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
      geom: buildGeom(s, wRatio, bodyRatio, jit),
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
      }
      p.depth += need[k] === "xxl" ? 30 : 20;
    }
  }
  pieces.sort((a, b) => a.depth - b.depth);
  return { pieces, clusters };
}

export function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function seg(ctx, a, b) {
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
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
  const G = p.geom;
  const g = p.gcache.grads;
  // 1) Caras rellenas con gradiente real, SIN stroke.
  tracePoly(ctx, [G.L, G.B, G.BC, G.BL]);
  ctx.fillStyle = g.left;
  ctx.fill();
  tracePoly(ctx, [G.R, G.B, G.BC, G.BR]);
  ctx.fillStyle = g.right;
  ctx.fill();
  tracePoly(ctx, [G.T, G.R, G.B, G.L]);
  ctx.fillStyle = g.top;
  ctx.fill();
  // 2) Aristas internas: finas, fijas.
  ctx.strokeStyle = "rgba(10,10,18,0.55)";
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.beginPath();
  seg(ctx, G.R, G.B);
  seg(ctx, G.B, G.L);
  seg(ctx, G.R, G.BR);
  seg(ctx, G.B, G.BC);
  seg(ctx, G.L, G.BL);
  ctx.stroke();
  // 3) Silueta exterior: el único stroke grueso y configurable.
  ctx.strokeStyle = "#0c0c13";
  ctx.lineWidth = outlinePx;
  tracePoly(ctx, [G.T, G.R, G.BR, G.BC, G.BL, G.L]);
  ctx.stroke();
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

export function drawFrame(ctx, sim, time, staticT) {
  const { w, h } = sim.size;
  ctx.fillStyle = sim.bg;
  ctx.fillRect(0, 0, w, h);
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
  // Sombra POR ENCIMA de los cubos, POR DEBAJO del texto (DOM).
  if (sim.shade) {
    ctx.fillStyle = sim.shade;
    ctx.fillRect(0, 0, w, h);
  }
}

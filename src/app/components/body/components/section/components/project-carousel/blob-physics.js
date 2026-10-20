/*
 * Física pura del blob (sin DOM ni React): forma orgánica deformable,
 * interpolación de color y sombreado. Implementación original; de la
 * referencia solo la ARQUITECTURA (blob por proyecto + tinte ~0.8s +
 * flotación con gravedad 0), nunca sus paths (su artwork).
 */

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shadeRgb([r, g, b], amt) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return [f(r), f(g), f(b)];
}

export function rgbCss([r, g, b], a = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

export function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Circ.easeInOut de la evidencia (morph de 1s del expend): fórmula cerrada,
// sin GSAP. Implementación original de la curva estándar.
export function easeCircInOut(t) {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.5) return (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2;
  return (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
}

/*
 * Gelatina por puntero (arquitectura de la evidencia `createPhysics`: el
 * cursor es un cuerpo que se traslada por delta del puntero y empuja los
 * vértices; la red (ancla .01 + vecinos + centro .04) recupera con wobble.
 * Aquí en motor paramétrico propio: N resortes radiales con acople a
 * vecinos; el puntero inyecta velocidad por solape con su radio.
 */
export function createJelly(n) {
  return {
    n,
    off: new Array(n).fill(0),
    vel: new Array(n).fill(0),
  };
}

export function stepJelly(j, dt, px, py, pvx, pvy, cx, cy, R, cfg) {
  const h = Math.max(0, Math.min(0.05, dt));
  if (h === 0) return 0;
  const w = 2 * Math.PI * cfg.freq;
  const cursorR = Math.max(40, R * 1.2);
  const range = cursorR + R * 0.35;
  let maxAbs = 0;
  for (let i = 0; i < j.n; i++) {
    const a = (i / j.n) * Math.PI * 2;
    const sx = cx + Math.cos(a) * R;
    const sy = cy + Math.sin(a) * R;
    const dx = sx - px;
    const dy = sy - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < range) {
      // Empuje radial hacia fuera, proporcional a la velocidad del puntero
      // en px/s (rápido = atraviesa, como el cursor-cuerpo de la ref).
      const overlap = 1 - d / range;
      const radial = (dx * pvx + dy * pvy) / Math.max(1, d);
      j.vel[i] += Math.max(0, radial) * cfg.gain * overlap;
      // Contacto: abolladura estática acotada (los cuerpos colisionan por
      // solape aunque el puntero vaya lento: sin esto, una máquina lenta
      // no excita jamás porque la velocidad medida colapsa).
      j.vel[i] += (overlap * cfg.dent - j.off[i]) * cfg.posK * h;
    }
    // Recuperación elástica (frecuencia propia) + acople a vecinos (la
    // "red" de la evidencia) + amortiguación exponencial. Euler
    // semi-implícito, estable con dt real.
    const prev = j.off[(i - 1 + j.n) % j.n];
    const next = j.off[(i + 1) % j.n];
    const neigh = (prev + next) / 2 - j.off[i];
    j.vel[i] += (-w * w * j.off[i] + cfg.neighbor * neigh) * h;
    j.vel[i] *= Math.exp(-cfg.damp * h);
    j.off[i] += j.vel[i] * h;
    const ab = Math.abs(j.off[i]);
    if (ab > maxAbs) maxAbs = ab;
  }
  return maxAbs;
}

// Suma bilineal del offset gelatina para un ángulo (curva suave).
export function jellyAt(j, theta) {
  const x = ((theta / (Math.PI * 2)) % 1 + 1) % 1 * j.n;
  const i0 = Math.floor(x) % j.n;
  const i1 = (i0 + 1) % j.n;
  const f = x - Math.floor(x);
  return j.off[i0] * (1 - f) + j.off[i1] * f;
}

// Radio polar deformado SIN rotación (feedback 2026-10-11: el blob "giraba"
// porque las fases viajaban con t): las fases son FIJAS por forma; solo
// morfean por proyecto (lerp en ProjectBlob) y la respiración escala.
// p = { amp1 (3 lóbulos), ph1, amp2 (pera, 2 lóbulos), ph2,
//       amp3 (rizado fino, 4 lóbulos), ph3, sx, sy (base elíptica) }.
// Rangos visuales (ver BLOB_SHAPES en carousel-config.js):
// amp1 0–0.18, amp2 0–0.16, amp3 0–0.08 (suma ≤0.30, si no se pinza),
// ph* 0–6.28 (≥0.8 rad de diferencia ya se nota), sx/sy 0.85–1.25.
export const SHAPE_DEFAULTS = {
  amp1: 0.1,
  ph1: 1.2,
  amp2: 0.05,
  ph2: 0.5,
  amp3: 0,
  ph3: 0.8,
  sx: 1,
  sy: 1,
};

export function blobRadius(theta, R, p, breath, jelly) {
  const q = { ...SHAPE_DEFAULTS, ...p };
  const base =
    R *
    breath *
    (1 +
      q.amp1 * Math.sin(3 * theta + q.ph1) +
      q.amp2 * Math.sin(2 * theta + q.ph2) +
      q.amp3 * Math.sin(4 * theta + q.ph3));
  return jelly ? base + jelly(theta) : base;
}

// Extremos proyectados de la silueta SUAVE unitaria (sin R, sin breath, sin
// gelatina): g(θ) = 1 + Σ ai·sin(fi·θ + φi); X = g·cosθ·sx, Y = g·sinθ·sy.
// La gelatina NO se muestrea: entra por cota exacta J0 = max|off| (lineal a
// trozos → el máximo está en los nudos) con |sinθ|,|cosθ| ≤ 1, así que J1 no
// existe en este diseño. Estimación muestreada (N paramétrico): el error se
// acota en vivo con Lipschitz (ver fórmula en ProjectBlob) usando el N real,
// con Dd/A de las amplitudes vivas (las fases no entran: peor-caso sobre θ).
export function extremesOf(p, n = 360) {
  const q = { ...SHAPE_DEFAULTS, ...p };
  const a1 = Math.abs(q.amp1);
  const a2 = Math.abs(q.amp2);
  const a3 = Math.abs(q.amp3);
  let gd = 0;
  let gu = 0;
  let gs = 0;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const g =
      1 +
      q.amp1 * Math.sin(3 * t + q.ph1) +
      q.amp2 * Math.sin(2 * t + q.ph2) +
      q.amp3 * Math.sin(4 * t + q.ph3);
    const yd = g * Math.sin(t) * q.sy;
    const ys = Math.abs(g * Math.cos(t)) * q.sx;
    if (yd > gd) gd = yd;
    if (-yd > gu) gu = -yd;
    if (ys > gs) gs = ys;
  }
  const A = a1 + a2 + a3;
  const Dd = 3 * a1 + 2 * a2 + 4 * a3;
  return { gd, gu, gs, A, Dd };
}

// Cota exacta de la deformación viva (px, sin escalar): el máximo del |offset|
// sobre los nudos. Verificado por construcción, no por observación.
export function jellyBound(jelly) {
  if (!jelly || !jelly.off) return 0;
  let m = 0;
  for (let i = 0; i < jelly.off.length; i++) {
    const a = Math.abs(jelly.off[i]);
    if (a > m) m = a;
  }
  return m;
}

// Traza el blob como curva cerrada suave (cuadráticas por puntos medios).
// La base elíptica (sx/sy) da pera/redonda/apaisada sin rotar jamás.
export function traceBlob(ctx, cx, cy, R, p, breath, n = 96, jelly = null) {
  let px = 0;
  let py = 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i <= n; i++) {
    const a = ((i % n) / n) * Math.PI * 2;
    const r = blobRadius(a, R, p, breath, jelly);
    const x = cx + Math.cos(a) * r * p.sx;
    const y = cy + Math.sin(a) * r * p.sy;
    if (i === 0) {
      mx = x;
      my = y;
      ctx.moveTo(x, y);
    } else if (i === n) {
      ctx.quadraticCurveTo(x, y, mx, my);
    } else {
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    px = x;
    py = y;
  }
  ctx.closePath();
}

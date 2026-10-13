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
// porque las fases viajaban con t): las fases son FIJAS globales; solo las
// amplitudes morfean por proyecto y la respiración escala el conjunto.
// p = { amp1 (3 lóbulos), amp2 (asimetría tipo pera), sx, sy (base elíptica) }.
const PHASE1 = 1.2;
const PHASE2 = 0.5;

export function blobRadius(theta, R, p, breath, jelly) {
  const base =
    R *
    breath *
    (1 +
      p.amp1 * Math.sin(3 * theta + PHASE1) +
      p.amp2 * Math.sin(2 * theta + PHASE2));
  return jelly ? base + jelly(theta) : base;
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

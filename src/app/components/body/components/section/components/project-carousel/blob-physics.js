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

// Radio polar deformado SIN rotación (feedback 2026-10-11: el blob "giraba"
// porque las fases viajaban con t): las fases son FIJAS globales; solo las
// amplitudes morfean por proyecto y la respiración escala el conjunto.
// p = { amp1 (3 lóbulos), amp2 (asimetría tipo pera), sx, sy (base elíptica) }.
const PHASE1 = 1.2;
const PHASE2 = 0.5;

export function blobRadius(theta, R, p, breath) {
  return (
    R *
    breath *
    (1 +
      p.amp1 * Math.sin(3 * theta + PHASE1) +
      p.amp2 * Math.sin(2 * theta + PHASE2))
  );
}

// Traza el blob como curva cerrada suave (cuadráticas por puntos medios).
// La base elíptica (sx/sy) da pera/redonda/apaisada sin rotar jamás.
export function traceBlob(ctx, cx, cy, R, p, breath, n = 96) {
  let px = 0;
  let py = 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i <= n; i++) {
    const a = ((i % n) / n) * Math.PI * 2;
    const r = blobRadius(a, R, p, breath);
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

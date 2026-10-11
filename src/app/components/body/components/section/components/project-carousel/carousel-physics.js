/*
 * Física pura del carrusel (sin DOM ni React): easings, inercia, clamp y
 * proximidad. Implementación original; las curvas Power4/Power3 replican la
 * FORMA de los easings de referencia (GSAP) con aritmética propia.
 */

export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function clamp(x, min, max) {
  if (min > max) return 0;
  return x < min ? min : x > max ? max : x;
}

// Power4.easeOut ≈ 1-(1-t)^4 (ref: 5 usos, hovers/tintes).
export function easeOutQuart(t) {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 4);
}

// Power4.easeInOut (ref: dominante, 13 usos — flechas/shows).
export function easeInOutQuart(t) {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

// Un paso de inercia con dt real normalizado a frames de 60fps.
// Devuelve { x, v, stopped }.
export function stepInertia(x, v, dtMs, friction, stopVel, min, max) {
  const frames = Math.max(0, Math.min(4, dtMs / 16.667));
  let nv = v * Math.pow(friction, frames);
  let nx = x + nv * frames;
  if (nx < min) {
    nx = min;
    nv = 0;
  } else if (nx > max) {
    nx = max;
    nv = 0;
  }
  if (Math.abs(nv) < stopVel) nv = 0;
  return { x: nx, v: nv, stopped: nv === 0 };
}

// Proximidad 0..1 de una tarjeta al centro del viewport (0 en el borde).
export function proximity(cardCenterX, viewCenterX, viewWidth) {
  const radius = Math.max(1, viewWidth / 2);
  return clamp01(1 - Math.abs(cardCenterX - viewCenterX) / radius);
}

export function cardScale(prox, minScale, maxScale) {
  return minScale + (maxScale - minScale) * prox * prox;
}

export function cardOpacity(prox, minOpacity) {
  return minOpacity + (1 - minOpacity) * prox;
}

// Índice de la tarjeta más cercana al centro.
export function nearestIndex(centers, x, viewCenterX) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(centers[i] + x - viewCenterX);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

"use client";

/*
 * ContactCubes: presencia lateral de contacto. Adaptación del motor del hero
 * (mismas primitivas: PALETTES, RNG, geometría, drawPiece), con distribución
 * propia: clusters a la derecha y deriva izquierda↔derecha con respiración.
 * Canvas propio de la sección (detrás de la card, sin clicks, aria-hidden).
 * Solo pinta cuando contacto está visible (IO); tope 30fps; frame estático
 * con reduced-motion. dataset.tick = evidencia de frames para E2E.
 */

import { useEffect, useRef } from "react";
import {
  PALETTES,
  buildGeom,
  buildPaths,
  drawPiece,
  gauss,
  hexToRgb,
  mulberry32,
  pickTier,
  rectDist,
  satisfies,
  tierSize,
} from "../hero-background/hero-field";
import "./contact-cubes.css";

// Receta idéntica al hero (hero-config.js): geometría "cubos" (sin
// deformar), tiers y tamaños sin recorte, outlinePct 100, rotSpread 100,
// speed 0.5. Solo cambia el escenario: lado derecho, menos piezas y
// despeje por cuerpo contra la card.
// Factor temporal único: todo lo animado corre al 75%. Amplitudes,
// tamaños y colores intactos: solo el tiempo se ralentiza.
const SP = 0.5;
const TS = 0.75;
const SEED = 7;

function makeContactField(w, h, card) {
  const rand = mulberry32(SEED);
  const colors = PALETTES.calida.colors;
  const u = Math.min(w, h);
  const mobile = w < 640;
  // En angosto la card ocupa casi todo el ancho: la composición vive en
  // las franjas libres (arriba-derecha y tira inferior), nunca tras la card.
  // Se decide por geometría real, no por breakpoint (tablet incluida).
  const narrow = card ? card.x1 - card.x0 > w * 0.7 : mobile;
  const n = narrow ? 30 : 48;
  const zone = card
    ? { text: card, h1: card }
    : { text: { x0: 0, y0: 0, x1: w * 0.6, y1: h }, h1: { x0: 0, y0: 0, x1: w * 0.6, y1: h } };
  // Cobertura continua a toda la altura derecha (clusters solapados).
  const mobileBands = narrow && card;
  const clusters = mobileBands
    ? [
        { x: w * 0.85, y: card.y0 / 2, r: u * 0.16, phase: rand() * 6.283, amp: 8 + rand() * 6, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.3, y: card.y1 + (h - card.y1) / 2, r: u * 0.18, phase: rand() * 6.283, amp: 8 + rand() * 6, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.7, y: card.y1 + (h - card.y1) / 2, r: u * 0.18, phase: rand() * 6.283, amp: 8 + rand() * 6, dx: rand() - 0.5, dy: rand() - 0.5 },
      ]
    : [
        { x: w * 0.72, y: h * 0.24, r: u * 0.2, phase: rand() * 6.283, amp: 10 + rand() * 8, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.82, y: h * 0.42, r: u * 0.22, phase: rand() * 6.283, amp: 10 + rand() * 8, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.74, y: h * 0.58, r: u * 0.22, phase: rand() * 6.283, amp: 10 + rand() * 8, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.84, y: h * 0.75, r: u * 0.22, phase: rand() * 6.283, amp: 10 + rand() * 8, dx: rand() - 0.5, dy: rand() - 0.5 },
        { x: w * 0.74, y: h * 0.9, r: u * 0.2, phase: rand() * 6.283, amp: 10 + rand() * 8, dx: rand() - 0.5, dy: rand() - 0.5 },
      ];
  const m = Math.max(w, h) * 0.12;
  // Rejilla estratificada sobre la zona derecha libre (excluye la card):
  // cobertura pareja sin grumos; el jitter da irregularidad natural.
  // La asignación a cluster (sway) es por cercanía, no por muestreo.
  const grid = mobileBands
    ? null
    : (() => {
        const x0 = card ? card.x1 + 16 : w * 0.55;
        const cells = [];
        const C = 4, R = 8;
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
            cells.push({
              x: x0 + ((c + 0.5) / C) * Math.max(1, w - x0),
              y: ((r + 0.5) / R) * h,
              w: Math.max(1, (w - x0) / C),
              h: h / R,
            });
          }
        }
        return cells;
      })();
  const nearestCluster = (x, y) => {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const d = (x - clusters[i].x) ** 2 + (y - clusters[i].y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const sample = () => {
    if (mobileBands) {
      if (rand() < 0.4) {
        const cl = clusters[0];
        return {
          x: cl.x + gauss(rand) * cl.r * 0.75,
          y: Math.max(0, Math.min(card.y0 - 8, cl.y + gauss(rand) * cl.r * 0.62)),
          cl: 0,
        };
      }
      const cl = clusters[1 + Math.floor(rand() * 2)];
      return {
        x: rand() * (w + m * 0.4) - m * 0.2,
        y: Math.min(h + m, Math.max(card.y1 + 8, cl.y + gauss(rand) * cl.r * 0.62)),
        cl: clusters.indexOf(cl),
      };
    }
    if (rand() < 0.85 && !grid) {
      const cl = clusters[Math.floor(rand() * clusters.length)];
      return {
        x: cl.x + gauss(rand) * cl.r * 0.75,
        y: cl.y + gauss(rand) * cl.r * 0.62,
        cl: clusters.indexOf(cl),
      };
    }
    if (grid) {
      const cell = grid[Math.floor(rand() * grid.length)];
      const x = cell.x + gauss(rand) * cell.w * 0.4;
      const y = cell.y + gauss(rand) * cell.h * 0.4;
      return { x, y, cl: nearestCluster(x, y) };
    }
    return { x: w * (0.66 + rand() * 0.36), y: rand() * (h + m * 2) - m, cl: -1 };
  };
  // Despeje por cuerpo + margen de deriva: ni el borde del cubo roza la card.
  // Despeje por cuerpo: el centro fuera de la card + margen de deriva.
  // Los cuerpos pueden asomar tras el borde (la card opaca los tapa limpio,
  // sin artefacto: parece que emergen de detrás).
  const clearOfCard = (x, y, s) => !card || rectDist(x, y, card) > s * 0.9 + w * 0.02;
  const pieces = [];
  for (let i = 0; i < n; i++) {
    // Receta del hero, con una sola adaptación de escenario: sin xxl (un
    // gigante recortado por el borde nunca se ve como en el hero; el xl
    // conserva la pieza statement). Todo lo demás idéntico al motor.
    let tier = pickTier(rand);
    if (tier === "xxl") tier = "xl";
    const s = Math.max(6, tierSize(tier, rand, u));
    let x = 0;
    let y = 0;
    let cl = -1;
    for (let a = 0; a < 6; a++) {
      const p = sample();
      x = p.x;
      y = p.y;
      cl = p.cl;
      if (satisfies(x, y, tier, zone, 1, u) && clearOfCard(x, y, s)) break;
    }
    const c1 = colors[Math.floor(rand() * colors.length)];
    let c2 = colors[Math.floor(rand() * colors.length)];
    if (c2 === c1) c2 = colors[(colors.indexOf(c1) + 3) % colors.length];
    const geom = buildGeom(s, 1, 1, [0, 0, 0, 0, 0, 0, 0]);
    pieces.push({
      x, y, s, tier, c1, c2,
      c1rgb: hexToRgb(c1),
      c2rgb: hexToRgb(c2),
      baseRgb: [0, 0, 0],
      gcache: null,
      cluster: cl,
      rot: (rand() - 0.5) * 1.4 + (rand() - 0.5) * 0.12,
      rotAmp: 0.008 + rand() * 0.02,
      rotFreq: 0.05 + rand() * 0.12,
      // Respiración visible pero sutil: ±3–6% efectivos (con SP). Cada cubo
      // con su frecuencia y fase: sin saltos ni sincronización global.
      breathAmp: 0.06 + rand() * 0.06,
      breathFreq: 0.08 + rand() * 0.2,
      period: 10 + rand() * 12,
      phase: rand() * Math.PI * 2,
      // Deriva propia: cada cubo con su velocidad, amplitud y fase.
      driftFreq: 0.05 + rand() * 0.1,
      driftAmp: 0.008 + rand() * 0.022,
      vx: (rand() - 0.5) * 9,
      vy: (rand() - 0.5) * 4,
      geom,
      paths: buildPaths(geom),
    });
  }
  pieces.sort((a, b) => a.s - b.s);
  return { pieces, clusters };
}

export default function ContactCubes() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sim = { pieces: [], clusters: [], w: 0, h: 0, staticDone: false, reduced: false, clock: 0 };
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    let visible = true;
    let regenT = null;

    const measureCard = () => {
      const sec = canvas.parentElement;
      const card = sec ? sec.querySelector(".contact-card") : null;
      if (!sec || !card) return null;
      const S = sec.getBoundingClientRect();
      const C = card.getBoundingClientRect();
      if (C.width === 0) return null;
      return { x0: C.left - S.left, y0: C.top - S.top, x1: C.right - S.left, y1: C.bottom - S.top };
    };

    const regen = () => {
      const sec = canvas.parentElement;
      if (!sec) return;
      const w = Math.max(1, Math.floor(sec.clientWidth));
      const h = Math.max(1, Math.floor(sec.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.w = w;
      sim.h = h;
      const f = makeContactField(w, h, measureCard());
      sim.pieces = f.pieces;
      sim.clusters = f.clusters;
      sim.staticDone = false;
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    sim.reduced = mq.matches;
    const onMq = (e) => {
      sim.reduced = e.matches;
      sim.staticDone = false;
    };
    mq.addEventListener("change", onMq);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const paint = (t) => {
      const { w, h } = sim;
      ctx.clearRect(0, 0, w, h);
      // Tiempo de color del hero: t·(0.25+0.75·speed), speed 0.5.
      const colorTime = t * 0.625;
      for (let i = 0; i < sim.pieces.length; i++) {
        const p = sim.pieces[i];
        const ct = (Math.sin((colorTime * Math.PI * 2) / p.period + p.phase) + 1) / 2;
        const BR = p.baseRgb;
        BR[0] = Math.round(p.c1rgb[0] + (p.c2rgb[0] - p.c1rgb[0]) * ct);
        BR[1] = Math.round(p.c1rgb[1] + (p.c2rgb[1] - p.c1rgb[1]) * ct);
        BR[2] = Math.round(p.c1rgb[2] + (p.c2rgb[2] - p.c1rgb[2]) * ct);
        const q = Math.round(ct * 48);
        let gx = 0;
        let gy = 0;
        if (p.cluster >= 0) {
          const cl = sim.clusters[p.cluster];
          const k = Math.sin((t * Math.PI * 2) / 53 + cl.phase) * cl.amp * SP;
          gx = k * cl.dx;
          gy = k * cl.dy;
        }
        // Respiración lateral propia: cada cubo con su velocidad, amplitud
        // y fase. edgeDamp frena a los del borde (sin huecos) sin tocar su
        // posición base: solo el desplazamiento, mismo objeto, in-place.
        const side = 0.3 + 0.7 * (p.x / Math.max(1, w));
        const edgeDamp = 1 - 0.65 * (p.x / Math.max(1, w));
        gx += Math.sin(t * Math.PI * 2 * p.driftFreq + p.phase) * p.driftAmp * w * side * edgeDamp;
        const cm = p.s * 2.7 + 12;
        const px = p.x + gx;
        const py = p.y + gy;
        if (px < -cm || px > w + cm || py < -cm || py > h + cm) continue;
        const breath = 1 + Math.sin(t * p.breathFreq * Math.PI * 2 + p.phase) * p.breathAmp * SP;
        const rot = p.rot + Math.sin(t * p.rotFreq * Math.PI * 2 + p.phase) * p.rotAmp * SP;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.scale(breath, breath);
        drawPiece(ctx, p, q, Math.min(10, Math.max(2, p.s * 0.05)));
        ctx.restore();
      }
      const n = Number(canvas.dataset.tick || 0) + 1;
      canvas.dataset.tick = String(n);
      canvas.dataset.clock = sim.clock.toFixed(2);
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !visible || sim.w === 0) return;
      if (sim.reduced) {
        if (!sim.staticDone) {
          paint(0.6);
          sim.staticDone = true;
        }
        return;
      }
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.05, rawDt);
      last = now;
      // Reloj propio al 75%: deriva, giros y respiración leen sim.clock.
      // El reloj usa dt sin clampar (tiempo nominal exacto); la física sí
      // se clampa por estabilidad. Misma constante TS en ambos.
      const sdt = dt * TS;
      sim.clock += rawDt * TS;
      for (const p of sim.pieces) {
        p.x += p.vx * SP * sdt;
        p.y += p.vy * SP * sdt;
        // Rebote en los márgenes (misma magnitud, sin salidas ni apariciones).
        const m = Math.max(sim.w, sim.h) * 0.15 + p.s;
        if (p.x < -m) { p.x = -m; p.vx = Math.abs(p.vx); }
        else if (p.x > sim.w + m) { p.x = sim.w + m; p.vx = -Math.abs(p.vx); }
        if (p.y < -m) { p.y = -m; p.vy = Math.abs(p.vy); }
        else if (p.y > sim.h + m) { p.y = sim.h + m; p.vy = -Math.abs(p.vy); }
      }
      if (now - lastPaint >= 1000 / 30) {
        paint(sim.clock);
        lastPaint = now;
      }
    };

    const onResize = () => {
      clearTimeout(regenT);
      regenT = setTimeout(regen, 150);
    };
    regen();
    // La card mide tras fuentes: re-mide para no pintar detrás de ella.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => regen());
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMq);
      io.disconnect();
      clearTimeout(regenT);
    };
  }, []);

  // Velo DELANTE del canvas (después en el DOM, mismo z-index): los cubos
  // emergen desde detrás de los bordes. La card/títulos (z1) no se tocan.
  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="contact-cubes" data-tick="0" />
      <div aria-hidden="true" className="contact-shade" />
    </>
  );
}

"use client";

/*
 * BLOB ÚNICO (regla 0-atajos, gate 4 AGENTS.md): este canvas es el único
 * objeto vivo del blob en todo el proyecto. Modos en el mismo loop y la
 * misma sim, sin duplicar canvas/loops ni fundidos cruzados. Modelo
 * CORTINA: el canvas NO se mueve jamás (siempre hijo de la sección,
 * tamaño de sección); solo cambian opacidad y forma:
 * - idle: deriva ambiental tras las tarjetas (color/forma de la activa).
 * - expanding: morfea a redondo y escala a cubrir la SECCIÓN (1s
 *   Circ.easeInOut, evidencia `expend()`) transparentando su color a
 *   fondo plano al llegar al 100% (decisión usuario, sin fotos).
 * - covering: estático TRANSPARENTE (no pinta): el papel lo pone la hoja
 *   opaca del detalle, que vive DEBAJO en la misma sección.
 * - collapsing: morph al revés (.8s) desde el 100%, recupera color
 *   encogiendo hasta la tarjeta. Dirección, duración y easing intactos.
 * Verificado en la referencia: un único bubble, morph in-place por puntos.
 */

import { useEffect, useRef } from "react";
import useStore from "@/app/store/store";
import { CAROUSEL_ITEMS, BLOB, FIT, blobShapeFor } from "./carousel-config";
import { CASES } from "@/app/components/case/cases";
import {
  hexToRgb,
  shadeRgb,
  rgbCss,
  lerp3,
  traceBlob,
  easeCircInOut,
  createJelly,
  stepJelly,
  jellyAt,
  extremesOf,
  jellyBound,
} from "./blob-physics";
import "./project-blob.css";

const ROUND = { amp1: 0.02, ph1: 1.2, amp2: 0.01, ph2: 0.5, amp3: 0, ph3: 0.8, sx: 1, sy: 1 };
const MORPH_MS = 1000;
const CLOSE_MS = 800;

export default function ProjectBlob({ items = CAROUSEL_ITEMS }) {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const carouselRef = useRef(null);
  const simRef = useRef({
    raf: 0,
    running: false,
    visible: true,
    reduced: false,
    init: false,
    mode: null,
    w: 0,
    h: 0,
    dpr: 1,
    ax: 0,
    ay: 0,
    R: 100,
    // Escala dinámica de presencia (ver computeSafe): suavizada + aplicada.
    // Reff = R × scale es el radio que dibuja Y siente la gelatina.
    scaleSm: 1,
    scale: 1,
    Reff: 100,
    color: hexToRgb(items[0].color),
    colorTgt: hexToRgb(items[0].color),
    shape: blobShapeFor(items[0].slug),
    shapeTgt: blobShapeFor(items[0].slug),
    // Rect del canvas en viewport, CACHEADO (nunca por frame: el layout por
    // frame es el coste que se elimina; se refresca en resize/scroll/evento).
    rect: { left: 0, top: 0 },
    // Gelatina por puntero (evidencia createPhysics): resortes radiales +
    // último puntero conocido (coords de viewport + su equivalente local,
    // calculado UNA vez por evento, no por frame).
    jelly: null,
    pointer: { x: 0, y: 0, lx: 0, ly: 0, vx: 0, vy: 0, t: 0, seen: false },
    // Morf de caso ( expanding/collapsing ).
    animT0: 0,
    p0: null,
    p1: null,
    caseHex: null,
  });

  const caseView = useStore((s) => s.caseView);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // OJO: section/carousel se resuelven UNA VEZ al montar (el canvas ya
    // no se reubica jamás: `closest('section')` siempre resuelve).
    if (!sectionRef.current) {
      const section = canvas.closest("section.section");
      const carousel = section ? section.querySelector(".carousel") : null;
      if (!section || !carousel) return;
      sectionRef.current = section;
      carouselRef.current = carousel;
    }
    const section = sectionRef.current;
    const carousel = carouselRef.current;
    const sim = simRef.current;

    // Rect cacheado: un solo layout por llamada (resize/scroll/evento).
    // Si el puntero ya se vio, su equivalente local se re-deriva del
    // viewport guardado (el scroll mueve el canvas bajo un puntero quieto).
    const updateRect = () => {
      const r = canvas.getBoundingClientRect();
      sim.rect.left = r.left;
      sim.rect.top = r.top;
      if (sim.pointer.seen) {
        sim.pointer.lx = sim.pointer.x - r.left;
        sim.pointer.ly = sim.pointer.y - r.top;
      }
    };

    const resizeSection = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth || 1));
      const h = Math.max(1, Math.floor(canvas.clientHeight || 1));
      const dpr = Math.min(window.devicePixelRatio || 1, BLOB.dprCap);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.w = w;
      sim.h = h;
      sim.dpr = dpr;
      const s = section.getBoundingClientRect();
      const c = carousel.getBoundingClientRect();
      updateRect();
      sim.ax = w / 2;
      sim.ay = c.top - s.top + c.height / 2;
      const free = Math.min(sim.ay, h - sim.ay);
      sim.R = Math.max(
        BLOB.minR,
        Math.min(BLOB.maxR, w * BLOB.widthFrac, free - BLOB.shadowBlur - 12)
      );
    };

    // Escala máxima SEGURA (dinámica, sin rMul manuales): extremos
    // proyectados de la forma viva (solo silueta suave; la gelatina entra
    // por cota exacta J0 y nunca se muestrea) + deriva rígida + margen
    // corporal 12px, con el error de muestreo en término propio:
    //   X:  s ≤ (halfW    − 12 − driftX − J0·sx) / (R·b·(ĝs + Lsx·π/N))
    //   Y↓: s ≤ (freeDown − 12 − driftY − J0·sy) / (R·b·(ĝd + Lsy·π/N))
    // (Y↑ análoga con freeUp; L = s_factor·(Dd+1+A), b = 1+breathAmp a pico,
    // N = FIT.samples real.) Si s la cumple, el cuerpo real conserva ≥12px
    // por construcción (valor medio: el máximo dista del muestreado ≤ L·π/N;
    // lo suave escala con s; J0/deriva/12 son px rígidos sin escalar).
    const computeSafe = (shape) => {
      const { w, h } = sim;
      if (!w || !h || sim.R <= 0) return 1;
      const J0 = jellyBound(sim.jelly);
      const e = extremesOf(shape, FIT.samples);
      const b = 1 + BLOB.breathAmp;
      const k = Math.PI / FIT.samples;
      const sx = shape.sx ?? 1;
      const sy = shape.sy ?? 1;
      const Lx = sx * (e.Dd + 1 + e.A);
      const Ly = sy * (e.Dd + 1 + e.A);
      const m = FIT.bodyMargin;
      const dx = BLOB.driftPx;
      const dy = BLOB.driftPx * 0.6;
      const sD = (h - sim.ay - m - dy - J0 * sy) / (sim.R * b * (e.gd + Ly * k));
      const sS = (w / 2 - m - dx - J0 * sx) / (sim.R * b * (e.gs + Lx * k));
      const sU = (sim.ay - m - dy - J0 * sy) / (sim.R * b * (e.gu + Ly * k));
      return Math.min(sD, sS, sU);
    };

    // Reparent ELIMINADO (modelo cortina): el canvas vive siempre en la
    // sección; solo cambian opacidad y forma. Se borra en vez de parchar.
    const blobPath = (cx, cy, R, shape, breath, jelly) => {
      ctx.beginPath();
      traceBlob(ctx, cx, cy, R, shape, breath, 96, jelly);
    };

    // Puntero para la gelatina: posición + velocidad (px/s) al evento.
    // El equivalente local se calcula AQUÍ (un layout por evento); el loop
    // por frame reutiliza el cacheado, sin tocar el layout.
    const onPointerMove = (e) => {
      const now = performance.now() / 1000;
      const dt = Math.max(0.001, now - (sim.pointer.t || now));
      sim.pointer.vx = ((e.clientX - sim.pointer.x) / dt) * (sim.pointer.seen ? 1 : 0);
      sim.pointer.vy = ((e.clientY - sim.pointer.y) / dt) * (sim.pointer.seen ? 1 : 0);
      sim.pointer.x = e.clientX;
      sim.pointer.y = e.clientY;
      sim.pointer.t = now;
      sim.pointer.seen = true;
      updateRect();
    };

    const drawAmbient = (t) => {
      const { w, h } = sim;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const breath = sim.reduced
        ? 1
        : 1 + Math.sin((t / BLOB.breathPeriod) * Math.PI * 2) * BLOB.breathAmp;
      const cx = sim.ax + Math.sin((t / BLOB.driftPeriod) * Math.PI * 2) * BLOB.driftPx;
      const cy = sim.ay + Math.cos((t / (BLOB.driftPeriod * 1.3)) * Math.PI * 2) * BLOB.driftPx * 0.6;
      // Gelatina: el puntero (coords viewport → locales por rect) empuja
      // con su velocidad; solo en reposo con movimiento (evidencia).
      let jellyFn = null;
      if (sim.reduced) {
        canvas.dataset.jelly = "0";
      } else if (sim.pointer.seen) {
        if (!sim.jelly) sim.jelly = createJelly(BLOB.jellySamples);
        // La velocidad es fresca al evento: decae en el loop para que un
        // puntero quieto deje de inyectar energía (si no, nunca recupera).
        const vdec = Math.exp(-8 * (sim.frameDt || 1 / 60));
        sim.pointer.vx *= vdec;
        sim.pointer.vy *= vdec;
        const maxAbs = stepJelly(
          sim.jelly,
          sim.frameDt || 1 / 60,
          sim.pointer.lx,
          sim.pointer.ly,
          sim.pointer.vx,
          sim.pointer.vy,
          cx,
          cy,
          sim.Reff,
          {
            freq: BLOB.jellyFreq,
            damp: BLOB.jellyDamp,
            neighbor: BLOB.jellyNeighbor,
            gain: BLOB.jellyGain,
            dent: BLOB.jellyDent,
            posK: BLOB.jellyPosK,
          }
        );
        canvas.dataset.jelly = String(Math.round(maxAbs));
        const j = sim.jelly;
        jellyFn = (theta) => jellyAt(j, theta);
      } else {
        canvas.dataset.jelly = "0";
      }
      const light = rgbCss(shadeRgb(sim.color, 52));
      const base = rgbCss(sim.color);
      const dark = rgbCss(shadeRgb(sim.color, -40));
      const g = ctx.createLinearGradient(0, cy - sim.Reff, 0, cy + sim.Reff);
      g.addColorStop(0, light);
      g.addColorStop(0.55, base);
      g.addColorStop(1, dark);
      ctx.save();
      ctx.globalAlpha = BLOB.fillAlpha;
      ctx.shadowColor = base;
      ctx.shadowBlur = BLOB.shadowBlur;
      ctx.fillStyle = g;
      blobPath(cx, cy, sim.Reff, sim.shape, breath, jellyFn);
      ctx.fill();
      ctx.restore();
    };

    // Frame del morph: interpola pose p0→p1 con k (0..1). El lienzo es
    // TRANSPARENTE salvo la forma: al abrir, el color se transparenta con
    // (1-k) hasta fundirse con la hoja opaca de papel que vive debajo (el
    // detalle es el primer hijo de la sección, el canvas el segundo). Al
    // cerrar, el alfa sube RÁPIDO (min(1,tt*4)): el blob se materializa
    // casi a tamaño completo y de ahí encoje visible — con (1-k) tardaba
    // ~500ms invisible y aparecía grande de golpe, leyéndose como
    // "re-expansión". La forma se pinta CON sombra (igual que en reposo:
    // mismo color y blur): sin ella el morph parpadeaba al arrancar.
    const drawMorph = (k, alpha) => {
      const { w, h } = sim;
      const cx = sim.p0.x + (sim.p1.x - sim.p0.x) * k;
      const cy = sim.p0.y + (sim.p1.y - sim.p0.y) * k;
      const R = sim.p0.R + (sim.p1.R - sim.p0.R) * k;
      const shape = {
        amp1: sim.p0.shape.amp1 + (sim.p1.shape.amp1 - sim.p0.shape.amp1) * k,
        ph1: sim.p0.shape.ph1 + (sim.p1.shape.ph1 - sim.p0.shape.ph1) * k,
        amp2: sim.p0.shape.amp2 + (sim.p1.shape.amp2 - sim.p0.shape.amp2) * k,
        ph2: sim.p0.shape.ph2 + (sim.p1.shape.ph2 - sim.p0.shape.ph2) * k,
        amp3: sim.p0.shape.amp3 + (sim.p1.shape.amp3 - sim.p0.shape.amp3) * k,
        ph3: sim.p0.shape.ph3 + (sim.p1.shape.ph3 - sim.p0.shape.ph3) * k,
        sx: sim.p0.shape.sx + (sim.p1.shape.sx - sim.p0.shape.sx) * k,
        sy: sim.p0.shape.sy + (sim.p1.shape.sy - sim.p0.shape.sy) * k,
      };
      const color = lerp3(sim.p0.color, sim.p1.color, k);
      ctx.clearRect(0, 0, w, h);
      if (k <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
      const light = rgbCss(shadeRgb(color, 52));
      const base = rgbCss(color);
      const dark = rgbCss(shadeRgb(color, -40));
      g.addColorStop(0, light);
      g.addColorStop(0.55, base);
      g.addColorStop(1, dark);
      ctx.shadowColor = base;
      ctx.shadowBlur = BLOB.shadowBlur;
      ctx.fillStyle = g;
      blobPath(cx, cy, R, shape, 1);
      ctx.fill();
      ctx.restore();
    };

    const loop = (now) => {
      const t = now / 1000;
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      if (!sim.mode) {
        const f = 1 - Math.exp(-BLOB.settleRate * dt);
        sim.color = lerp3(sim.color, sim.colorTgt, f);
        for (const key of ["amp1", "ph1", "amp2", "ph2", "amp3", "ph3", "sx", "sy"]) {
          sim.shape[key] += (sim.shapeTgt[key] - sim.shape[key]) * f;
        }
        // Escala segura sobre la forma VIVA (el morph intermedio queda
        // cubierto por construcción): meta suavizada + tope instantáneo.
        const safeNow = computeSafe(sim.shape);
        sim.scaleSm += (Math.min(FIT.target, safeNow) - sim.scaleSm) * f;
        let sc = Math.min(sim.scaleSm, safeNow);
        if (!Number.isFinite(sc)) sc = 1;
        sim.scale = Math.max(0.5, sc);
        canvas.dataset.fit = sim.scale.toFixed(3);
        sim.Reff = sim.R * sim.scale;
        sim.frameDt = dt;
        drawAmbient(t);
        if (sim.reduced || !sim.visible || document.hidden) {
          sim.running = false;
          sim.raf = 0;
          return;
        }
        sim.raf = requestAnimationFrame(loop);
        return;
      }
      // covering es estático por diseño (lienzo transparente: un frame
      // tardío (p. ej. reporte inicial del IO tras re-observar en un
      // re-render) calcularía tt saturado con alfa 1 y plantaría azul sólido
      // para siempre. Aquí no se pinta: la hoja opaca de debajo pone el papel.
      if (sim.mode === "covering") {
        sim.running = false;
        sim.raf = 0;
        return;
      }
      const dur = sim.mode === "expanding" ? MORPH_MS : CLOSE_MS;
      const tt = Math.max(0, Math.min(1, (now - sim.animT0) / dur));
      // p0 es SIEMPRE la pose inicial y p1 la final en ambos modos, así k va
      // 0→1 en los dos: abrir recorre sección→cubierto y cerrar recorre
      // cubierto→tarjeta (contracción). El `1-ease` anterior invertía el
      // cierre (iba de tarjeta a pantalla: expansión).
      const k = easeCircInOut(tt);
      // Continua desde 0 (sin salto respecto al cubierto transparente) y con
      // el MISMO alfa del reposo (fillAlpha): el morph nace y aterriza
      // exactamente sobre el frame ambiental, sin pop de brillo de 1 frame
      // que el muestreo E2E leía como bache de 12px en la monotonía.
      const alpha =
        sim.mode === "expanding" ? (1 - k) * BLOB.fillAlpha : Math.min(1, tt * 4) * BLOB.fillAlpha;
      drawMorph(k, alpha);
      canvas.dataset.color = sim.caseHex;
      // Hook de test (mismo patrón que dataset.color): el E2E afirma
      // monotonicidad de k por modo (la dirección la prueba la geometría).
      canvas.dataset.k = k.toFixed(3);
      if (tt < 1) {
        sim.raf = requestAnimationFrame(loop);
      } else {
        sim.running = false;
        sim.raf = 0;
      }
    };
    let last = 0;

    const ensureLoop = () => {
      if (!sim.running && !sim.reduced && (sim.visible || sim.mode)) {
        sim.running = true;
        last = 0;
        sim.raf = requestAnimationFrame(loop);
      }
    };

    const startExpand = (slug) => {
      const item = CASES[slug];
      sim.caseHex = item ? item.color : "#cf4409";
      sim.caseRgb = hexToRgb(sim.caseHex);
      // Cortina: pose inicial DIRECTA en coords de sección (el canvas no se
      // mueve: sim.ax/ay/R ya viven en ese espacio, sin conversiones).
      sim.p0 = {
        x: sim.ax,
        y: sim.ay,
        R: sim.R * (sim.scale || 1),
        shape: { ...sim.shape },
        color: [...sim.color],
      };
      // Cobertura de la SECCIÓN (100vh = pantalla): esquinas exactas (la
      // evidencia escala su plantilla ×6 viewport: visualmente equivalente).
      sim.p1 = {
        x: sim.w / 2,
        y: sim.h / 2 - 40,
        R: (Math.hypot(sim.w, sim.h) / 2) * 1.05,
        shape: { ...ROUND },
        color: [...sim.caseRgb],
      };
      sim.mode = "expanding";
      sim.animT0 = performance.now();
      canvas.dataset.color = sim.caseHex;
      if (sim.reduced) {
        drawMorph(1, 0);
        return;
      }
      ensureLoop();
    };

    // Flujo único: cerrar SOLO desde el 100% cubierto. Vuelta desde la
    // pose cubierta hacia la tarjeta, en coords de SECCIÓN (offset entre
    // rects, sin viewport). Mismo objeto, mismo loop. Dirección, duración
    // y easing INTACTOS (validados, no se tocan).
    const startCollapse = () => {
      if (!sim.mode || sim.mode === "collapsing") return;
      sim.p0 = {
        x: sim.w / 2,
        y: sim.h / 2 - 40,
        R: (Math.hypot(sim.w, sim.h) / 2) * 1.05,
        shape: { ...ROUND },
        color: sim.caseRgb ? [...sim.caseRgb] : [...sim.color],
      };
      const kr = canvas.getBoundingClientRect();
      const c = carousel.getBoundingClientRect();
      // R de sección en px (conservado de antes de expandir).
      sim.p1 = {
        x: c.left - kr.left + c.width / 2,
        y: c.top - kr.top + c.height / 2,
        R: sim.R * (sim.scale || 1),
        shape: { ...sim.shape },
        color: [...sim.color],
      };
      sim.mode = "collapsing";
      sim.animT0 = performance.now();
      if (sim.reduced) {
        endToIdle();
        return;
      }
      ensureLoop();
    };

    // Identidad por slug (no por índice): el orden del carrusel puede
    // cambiar sin romper color/forma de cada proyecto.
    const onSlug = (slug) => {
      if (sim.mode) return;
      const item = items.find((it) => it.slug === slug) || items[0];
      sim.colorTgt = hexToRgb(item.color);
      sim.shapeTgt = blobShapeFor(item.slug);
      canvas.dataset.color = item.color;
      if (sim.reduced) {
        sim.color = [...sim.colorTgt];
        sim.shape = { ...sim.shapeTgt };
        const safeNow = computeSafe(sim.shape);
        sim.scaleSm = Math.min(FIT.target, safeNow);
        sim.scale = Math.max(0.5, sim.scaleSm);
        canvas.dataset.fit = sim.scale.toFixed(3);
        sim.Reff = sim.R * sim.scale;
        drawAmbient(0.6);
        return;
      }
      ensureLoop();
    };

    const endToIdle = () => {
      sim.mode = null;
      sim.caseRgb = null;
      sim.p0 = null;
      sim.p1 = null;
      // dataset.k NO se resetea: el último frame persiste como evidencia de
      // fin de morph (el E2E de cierre lo lee tras desmontar).
      resizeSection();
      onSlug(carousel.dataset.activeSlug || "");
    };

    const mo = new MutationObserver(() => {
      onSlug(carousel.dataset.activeSlug || "");
    });

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              sim.visible = entries.some((e) => e.isIntersecting);
              if (sim.visible) ensureLoop();
            },
            { threshold: 0.05 }
          )
        : null;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      sim.reduced = mq.matches;
      if (sim.reduced) {
        cancelAnimationFrame(sim.raf);
        sim.running = false;
        if (sim.mode) {
          // Con reduced no se anima: se planta el estado final del modo
          // (transparente: la hoja opaca de debajo pone el papel).
          if (sim.mode === "covering" || sim.mode === "expanding") {
            drawMorph(1, 0);
          } else {
            endToIdle();
          }
        } else {
          onSlug(carousel.dataset.activeSlug || "");
        }
      } else {
        ensureLoop();
      }
    };
    syncReduced();

    const onResize = () => {
      // Cortina: el lienzo siempre mide la sección (sin viewport). En
      // covering basta re-medir (el bitmap se limpia y la hoja opaca de
      // debajo sigue poniendo el papel).
      if (sim.mode === "covering") {
        resizeSection();
      } else if (sim.mode) {
        resizeSection();
        ensureLoop();
      } else {
        resizeSection();
        // Al re-medir, la escala solo puede BAJAR de golpe (nunca exceder el
        // nuevo límite); el crecimiento vuelve suave por el loop.
        sim.scaleSm = Math.min(sim.scaleSm, Math.min(FIT.target, computeSafe(sim.shape)));
        if (sim.reduced) {
          sim.scale = Math.max(0.5, sim.scaleSm);
          canvas.dataset.fit = sim.scale.toFixed(3);
          sim.Reff = sim.R * sim.scale;
          drawAmbient(0.6);
        } else ensureLoop();
      }
    };
    // Attach SIEMPRE con su cleanup (StrictMode invoca el efecto 2 veces en
    // dev: setup→cleanup→setup; con guard de "una vez" el segundo setup no
    // re-observaba tras el disconnect del cleanup y el MO moría en silencio
    // — cazado por E2E. Simétrico = correcto en mount, updates y StrictMode).
    mo.observe(carousel, { attributes: true, attributeFilter: ["data-active-slug"] });
    if (io) io.observe(canvas);
    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    mq.addEventListener("change", syncReduced);

    // Setup inicial (una vez por instancia) + aplicación de modo (en cada
    // cambio de caseView, sin cleanup: solo el de abajo, al desmontar).
    if (!sim.init) {
      sim.init = true;
      resizeSection();
      canvas.dataset.color = items[0].color;
      if (sim.reduced) {
        const safeNow = computeSafe(sim.shape);
        sim.scaleSm = Math.min(FIT.target, safeNow);
        sim.scale = Math.max(0.5, sim.scaleSm);
        canvas.dataset.fit = sim.scale.toFixed(3);
        sim.Reff = sim.R * sim.scale;
        drawAmbient(0.6);
      } else ensureLoop();
    }
    const mode = caseView?.mode || null;
    if (mode === "expand" && sim.mode !== "expanding" && sim.mode !== "covering") {
      startExpand(caseView.slug);
    } else if (mode === "cover" && sim.mode === "expanding") {
      // Cubierto = lienzo transparente estático, sin loop (el loop de
      // expanding ya pintó el último frame; se asegura por si el timing
      // derivó). El papel lo pone la hoja opaca que vive debajo.
      sim.mode = "covering";
      sim.running = false;
      cancelAnimationFrame(sim.raf);
      sim.raf = 0;
      drawMorph(1, 0);
      canvas.dataset.color = sim.caseHex;
      canvas.dataset.k = "1.000";
    } else if (mode === "collapse" && sim.mode && sim.mode !== "collapsing") {
      startCollapse();
    } else if (
      (mode === "expand" && sim.mode === "expanding") ||
      (mode === "collapse" && sim.mode === "collapsing")
    ) {
      // Re-render a mitad del morph (este efecto corre sin deps: el cleanup
      // de arriba cancela el rAF). Si el loop murió, se REANUDA sin reiniciar
      // el morph (animT0 intacto, k sigue su curva wall-clock): dirección,
      // duración y easing intactos. Sin esto, un render inoportuno dejaba la
      // cortina en blanco (cazado en screenshot mid-expand).
      ensureLoop();
    } else if (!mode && sim.mode) {
      endToIdle();
    }
    return () => {
      cancelAnimationFrame(sim.raf);
      sim.running = false;
      mo.disconnect();
      if (io) io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      mq.removeEventListener("change", syncReduced);
    };
  });

  return <canvas ref={canvasRef} aria-hidden="true" className="project-blob" data-color={items[0].color} data-jelly="0" data-k="0.000" data-fit="1.000" />;
}

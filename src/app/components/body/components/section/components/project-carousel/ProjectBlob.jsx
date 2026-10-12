"use client";

/*
 * BLOB ÚNICO (regla 0-atajos, gate 4 AGENTS.md): este canvas es el único
 * objeto vivo del blob en todo el proyecto. Modos en el mismo loop y la
 * misma sim, sin duplicar canvas/loops ni fundidos cruzados:
 * - idle: deriva ambiental tras las tarjetas (color/forma de la activa).
 * - expanding: FIXED fullscreen; morfea a redondo y escala a cubrir (1s
 *   Circ.easeInOut, evidencia `expend()`) transparentando su color a
 *   fondo plano al llegar al 100% (decisión usuario, sin fotos).
 * - covering: frame estático en fondo plano (como el stopFrame).
 * - collapsing: morph al revés (.8s) desde el 100%, recupera color
 *   encogiendo hasta la tarjeta y vuelta a la sección.
 * Verificado en la referencia: un único bubble, morph in-place por puntos.
 */

import { useEffect, useRef } from "react";
import useStore from "@/app/store/store";
import { CAROUSEL_ITEMS, BLOB_SHAPES, BLOB } from "./carousel-config";
import { CASES } from "@/app/components/case/cases";
import {
  hexToRgb,
  shadeRgb,
  rgbCss,
  lerp3,
  traceBlob,
  easeCircInOut,
} from "./blob-physics";
import "./project-blob.css";

const ROUND = { amp1: 0.02, amp2: 0.01, sx: 1, sy: 1 };
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
    color: hexToRgb(items[0].color),
    colorTgt: hexToRgb(items[0].color),
    shape: { ...BLOB_SHAPES[0] },
    shapeTgt: { ...BLOB_SHAPES[0] },
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
    // OJO: section/carousel se resuelven UNA VEZ al montar. El canvas se
    // reubica a <main> en modo caso: si se re-resolvieran desde el canvas,
    // `closest('section')` daría null y el efecto moriría en silencio
    // (cazado por E2E: el close dejaba .full colgado).
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
      sim.ax = w / 2;
      sim.ay = c.top - s.top + c.height / 2;
      const free = Math.min(sim.ay, h - sim.ay);
      sim.R = Math.max(
        BLOB.minR,
        Math.min(BLOB.maxR, w * BLOB.widthFrac, free - BLOB.shadowBlur - 12)
      );
    };

    const resizeWindow = () => {
      const w = Math.max(1, Math.floor(window.innerWidth));
      const h = Math.max(1, Math.floor(window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, BLOB.dprCap);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.w = w;
      sim.h = h;
      sim.dpr = dpr;
    };

    const blobPath = (cx, cy, R, shape, breath) => {
      ctx.beginPath();
      traceBlob(ctx, cx, cy, R, shape, breath);
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
      const light = rgbCss(shadeRgb(sim.color, 52));
      const base = rgbCss(sim.color);
      const dark = rgbCss(shadeRgb(sim.color, -40));
      const g = ctx.createLinearGradient(0, cy - sim.R, 0, cy + sim.R);
      g.addColorStop(0, light);
      g.addColorStop(0.55, base);
      g.addColorStop(1, dark);
      ctx.save();
      ctx.globalAlpha = BLOB.fillAlpha;
      ctx.shadowColor = base;
      ctx.shadowBlur = BLOB.shadowBlur;
      ctx.fillStyle = g;
      blobPath(cx, cy, sim.R, sim.shape, breath);
      ctx.fill();
      ctx.restore();
    };

    // Frame del morph: interpola pose p0→p1 con k (0..1). El color se
    // transparenta con (1-k): al cubrir queda el fondo plano y al cerrar
    // recupera color encogiendo (decisión usuario, sin fotos).
    const drawMorph = (k) => {
      const { w, h } = sim;
      const cx = sim.p0.x + (sim.p1.x - sim.p0.x) * k;
      const cy = sim.p0.y + (sim.p1.y - sim.p0.y) * k;
      const R = sim.p0.R + (sim.p1.R - sim.p0.R) * k;
      const shape = {
        amp1: sim.p0.shape.amp1 + (sim.p1.shape.amp1 - sim.p0.shape.amp1) * k,
        amp2: sim.p0.shape.amp2 + (sim.p1.shape.amp2 - sim.p0.shape.amp2) * k,
        sx: sim.p0.shape.sx + (sim.p1.shape.sx - sim.p0.shape.sx) * k,
        sy: sim.p0.shape.sy + (sim.p1.shape.sy - sim.p0.shape.sy) * k,
      };
      const color = lerp3(sim.p0.color, sim.p1.color, k);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#e9e0cf";
      ctx.fillRect(0, 0, w, h);
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - k));
      blobPath(cx, cy, R, shape, 1);
      ctx.clip();
      const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
      const light = rgbCss(shadeRgb(color, 52));
      const dark = rgbCss(shadeRgb(color, -40));
      g.addColorStop(0, light);
      g.addColorStop(0.55, rgbCss(color));
      g.addColorStop(1, dark);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const loop = (now) => {
      const t = now / 1000;
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      if (!sim.mode) {
        const f = 1 - Math.exp(-BLOB.settleRate * dt);
        sim.color = lerp3(sim.color, sim.colorTgt, f);
        for (const key of ["amp1", "amp2", "sx", "sy"]) {
          sim.shape[key] += (sim.shapeTgt[key] - sim.shape[key]) * f;
        }
        drawAmbient(t);
        if (sim.reduced || !sim.visible || document.hidden) {
          sim.running = false;
          sim.raf = 0;
          return;
        }
        sim.raf = requestAnimationFrame(loop);
        return;
      }
      const dur = sim.mode === "expanding" ? MORPH_MS : CLOSE_MS;
      const tt = Math.max(0, Math.min(1, (now - sim.animT0) / dur));
      const k = sim.mode === "expanding" ? easeCircInOut(tt) : 1 - easeCircInOut(tt);
      drawMorph(k);
      canvas.dataset.color = sim.caseHex;
      // Hook de test (mismo patrón que dataset.color): el E2E afirma que
      // el colapso es monotónico 1→0 sin re-crecimiento.
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

    // Reparentar a <main> al expandir (y devolver al cerrar): el fundido
    // de .body pondría opacity:0 a TODO su subárbol incluido este canvas
    // (la opacidad no se puede excluir por descendiente). Sigue siendo EL
    // MISMO elemento, bitmap y loop intactos: la identidad se conserva.
    const moveToMain = () => {
      // Selector "main" a secas: el module CSS renombra la clase (no es .home).
      const main = document.querySelector("main");
      if (main && canvas.parentElement !== main) {
        sim.homeParent = canvas.parentElement;
        sim.homeNext = canvas.nextSibling;
        main.appendChild(canvas);
      }
    };
    const moveBackHome = () => {
      if (sim.homeParent) {
        sim.homeParent.insertBefore(canvas, sim.homeNext);
        sim.homeParent = null;
        sim.homeNext = null;
      }
    };
    const startExpand = (slug) => {
      const item = CASES[slug];
      sim.caseHex = item ? item.color : "#cf4409";
      sim.caseRgb = hexToRgb(sim.caseHex);
      // Pose inicial = estado vivo actual en coords de viewport.
      const r = canvas.getBoundingClientRect();
      const sx = r.width / Math.max(1, sim.w);
      const sy = r.height / Math.max(1, sim.h);
      const p0 = {
        x: r.left + sim.ax * sx,
        y: r.top + sim.ay * sy,
        R: sim.R * Math.max(sx, sy),
        shape: { ...sim.shape },
        color: [...sim.color],
      };
      canvas.classList.add("full");
      moveToMain();
      resizeWindow();
      sim.p0 = p0;
      // Cobertura exacta de esquinas (la evidencia escala su plantilla ×6
      // viewport: visualmente equivalente).
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
        moveToMain();
        resizeWindow();
        sim.p1 = {
          x: sim.w / 2,
          y: sim.h / 2 - 40,
          R: (Math.hypot(sim.w, sim.h) / 2) * 1.05,
          shape: { ...ROUND },
          color: [...sim.caseRgb],
        };
        drawMorph(1);
        return;
      }
      ensureLoop();
    };

    // Flujo único: cerrar SOLO desde el 100% cubierto. Vuelta desde la
    // pose cubierta hacia la pose de sección (ancla en coords de viewport;
    // el lienzo sigue fixed hasta el final). Mismo objeto, mismo loop.
    const startCollapse = () => {
      if (!sim.mode || sim.mode === "collapsing") return;
      sim.p0 = {
        x: sim.w / 2,
        y: sim.h / 2 - 40,
        R: (Math.hypot(sim.w, sim.h) / 2) * 1.05,
        shape: { ...ROUND },
        color: sim.caseRgb ? [...sim.caseRgb] : [...sim.color],
      };
      const c = carousel.getBoundingClientRect();
      const axVp = c.left + c.width / 2;
      // R de sección en px (conservado de antes de expandir).
      sim.p1 = {
        x: axVp,
        y: c.top + c.height / 2,
        R: sim.R,
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

    const endToIdle = () => {
      sim.mode = null;
      sim.caseRgb = null;
      sim.p0 = null;
      sim.p1 = null;
      canvas.classList.remove("full");
      moveBackHome();
      resizeSection();
      onIndex(Number(carousel.dataset.activeIndex || 0));
    };

    const onIndex = (idx) => {
      if (sim.mode) return;
      const i = Math.max(0, Math.min(items.length - 1, idx));
      sim.colorTgt = hexToRgb(items[i].color);
      sim.shapeTgt = { ...BLOB_SHAPES[i % BLOB_SHAPES.length] };
      canvas.dataset.color = items[i].color;
      if (sim.reduced) {
        sim.color = [...sim.colorTgt];
        sim.shape = { ...sim.shapeTgt };
        drawAmbient(0.6);
        return;
      }
      ensureLoop();
    };

    const mo = new MutationObserver(() => {
      onIndex(Number(carousel.dataset.activeIndex || 0));
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
    if (io) io.observe(canvas);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      sim.reduced = mq.matches;
      if (sim.reduced) {
        cancelAnimationFrame(sim.raf);
        sim.running = false;
        if (sim.mode) {
          // Con reduced no se anima: se planta el estado final del modo.
          if (sim.mode === "covering" || sim.mode === "expanding") {
            moveToMain();
            resizeWindow();
            canvas.classList.add("full");
            drawMorph(1);
          } else {
            endToIdle();
          }
        } else {
          onIndex(Number(carousel.dataset.activeIndex || 0));
        }
      } else {
        ensureLoop();
      }
    };
    syncReduced();

    const onResize = () => {
      if (sim.mode === "covering") {
        resizeWindow();
        drawMorph(1);
      } else if (sim.mode) {
        resizeWindow();
        ensureLoop();
      } else {
        resizeSection();
        if (sim.reduced) drawAmbient(0.6);
        else ensureLoop();
      }
    };
    // Attach SIEMPRE con su cleanup (StrictMode invoca el efecto 2 veces en
    // dev: setup→cleanup→setup; con guard de "una vez" el segundo setup no
    // re-observaba tras el disconnect del cleanup y el MO moría en silencio
    // — cazado por E2E. Simétrico = correcto en mount, updates y StrictMode).
    mo.observe(carousel, { attributes: true, attributeFilter: ["data-active-index"] });
    if (io) io.observe(canvas);
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", syncReduced);

    // Setup inicial (una vez por instancia) + aplicación de modo (en cada
    // cambio de caseView, sin cleanup: solo el de abajo, al desmontar).
    if (!sim.init) {
      sim.init = true;
      resizeSection();
      canvas.dataset.color = items[0].color;
      if (sim.reduced) drawAmbient(0.6);
      else ensureLoop();
    }
    const mode = caseView?.mode || null;
    if (mode === "expand" && sim.mode !== "expanding" && sim.mode !== "covering") {
      startExpand(caseView.slug);
    } else if (mode === "cover" && sim.mode === "expanding") {
      // Cubierto = fondo plano estático, sin loop (el loop de expanding
      // ya pintó el último frame; se asegura por si el timing derivó).
      sim.mode = "covering";
      sim.running = false;
      cancelAnimationFrame(sim.raf);
      sim.raf = 0;
      drawMorph(1);
      canvas.dataset.color = sim.caseHex;
      canvas.dataset.k = "1.000";
    } else if (mode === "collapse" && sim.mode && sim.mode !== "collapsing") {
      startCollapse();
    } else if (!mode && sim.mode) {
      endToIdle();
    }
    return () => {
      cancelAnimationFrame(sim.raf);
      sim.running = false;
      mo.disconnect();
      if (io) io.disconnect();
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", syncReduced);
    };
  });

  return <canvas ref={canvasRef} aria-hidden="true" className="project-blob" data-color={items[0].color} />;
}

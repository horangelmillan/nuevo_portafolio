"use client";

/*
 * Blob a tamaño de SECCIÓN (A2.2): el lienzo cubre la sección Proyectos
 * completa (el lienzo pequeño recortaba la sombra con una línea recta).
 * El radio se calcula del espacio libre real sobre/bajo el ancla (centro
 * del carrusel) menos la sombra: imposible recortar en ningún viewport.
 * Sigue al índice activo vía MutationObserver (sin acoplar estados React).
 */

import { useEffect, useRef } from "react";
import { CAROUSEL_ITEMS, BLOB_SHAPES, BLOB } from "./carousel-config";
import { hexToRgb, shadeRgb, rgbCss, lerp3, traceBlob } from "./blob-physics";
import "./project-blob.css";

export default function ProjectBlob({ items = CAROUSEL_ITEMS }) {
  const canvasRef = useRef(null);
  const simRef = useRef({
    raf: 0,
    running: false,
    visible: true,
    reduced: false,
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
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const section = canvas.closest("section.section");
    const carousel = section ? section.querySelector(".carousel") : null;
    if (!section || !carousel) return;
    const sim = simRef.current;

    const resize = () => {
      // Caja del lienzo = caja de la sección (CSS inset:0).
      const w = Math.max(1, Math.floor(canvas.clientWidth || 1));
      const h = Math.max(1, Math.floor(canvas.clientHeight || 1));
      const dpr = Math.min(window.devicePixelRatio || 1, BLOB.dprCap);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.w = w;
      sim.h = h;
      sim.dpr = dpr;
      // Ancla = centro del carrusel relativo a la sección (los rects se
      // desplazan juntos con el scroll: la diferencia es estable).
      const s = section.getBoundingClientRect();
      const c = carousel.getBoundingClientRect();
      sim.ax = w / 2;
      sim.ay = c.top - s.top + c.height / 2;
      // Radio = lo que quepa sobre/bajo el ancla menos la sombra: nunca
      // se recorta ni el blob ni su sombra en ningún viewport.
      const free = Math.min(sim.ay, h - sim.ay);
      sim.R = Math.max(
        BLOB.minR,
        Math.min(BLOB.maxR, w * BLOB.widthFrac, free - BLOB.shadowBlur - 12)
      );
    };

    const draw = (t) => {
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
      ctx.beginPath();
      traceBlob(ctx, cx, cy, sim.R, sim.shape, breath);
      ctx.fill();
      ctx.restore();
    };

    const loop = (now) => {
      const t = now / 1000;
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const f = 1 - Math.exp(-BLOB.settleRate * dt);
      sim.color = lerp3(sim.color, sim.colorTgt, f);
      for (const key of ["amp1", "amp2", "sx", "sy"]) {
        sim.shape[key] += (sim.shapeTgt[key] - sim.shape[key]) * f;
      }
      draw(t);
      if (sim.reduced || !sim.visible || document.hidden) {
        sim.running = false;
        sim.raf = 0;
        return;
      }
      sim.raf = requestAnimationFrame(loop);
    };
    let last = 0;

    const ensureLoop = () => {
      if (!sim.running && !sim.reduced && sim.visible) {
        sim.running = true;
        last = 0;
        sim.raf = requestAnimationFrame(loop);
      }
    };

    const onIndex = (idx) => {
      const i = Math.max(0, Math.min(items.length - 1, idx));
      sim.colorTgt = hexToRgb(items[i].color);
      sim.shapeTgt = { ...BLOB_SHAPES[i % BLOB_SHAPES.length] };
      canvas.dataset.color = items[i].color;
      if (sim.reduced) {
        sim.color = [...sim.colorTgt];
        sim.shape = { ...sim.shapeTgt };
        draw(0.6);
        return;
      }
      ensureLoop();
    };

    const mo = new MutationObserver(() => {
      onIndex(Number(carousel.dataset.activeIndex || 0));
    });
    mo.observe(carousel, { attributes: true, attributeFilter: ["data-active-index"] });

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
        onIndex(Number(carousel.dataset.activeIndex || 0));
      } else {
        ensureLoop();
      }
    };
    syncReduced();

    const onResize = () => {
      resize();
      if (sim.reduced) draw(0.6);
      else ensureLoop();
    };
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", syncReduced);

    resize();
    canvas.dataset.color = items[0].color;
    if (sim.reduced) draw(0.6);
    else ensureLoop();

    return () => {
      cancelAnimationFrame(sim.raf);
      sim.running = false;
      mo.disconnect();
      if (io) io.disconnect();
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", syncReduced);
    };
    // Montaje único: estado en refs (patrón HeroBackground/carrusel).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="project-blob" data-color={items[0].color} />;
}

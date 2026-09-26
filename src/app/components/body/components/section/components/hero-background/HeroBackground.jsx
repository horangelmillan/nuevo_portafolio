"use client";

/*
 * Fondo generativo del hero: canvas con composición de bloques + sombra,
 * detrás del contenido (fondo → cubos → sombra → texto DOM).
 * Sin controles visibles: configuración interna en hero-config.js.
 * La sección padre (server) no necesita refs: se auto-localiza vía DOM.
 */

import { useEffect, useRef, useState } from "react";
import { HERO_BG } from "./hero-config";
import {
  PALETTES,
  makeField,
  drawFrame,
  buildBg,
  buildShade,
  measureZone,
  fallbackZone,
} from "./hero-field";
import "./hero-background.css";

export default function HeroBackground() {
  const canvasRef = useRef(null);
  const simRef = useRef({
    pieces: [],
    clusters: [],
    visible: true,
    staticRendered: false,
    reducedFlag: false,
    bg: null,
    shade: null,
    zone: null,
    size: { w: 0, h: 0, dpr: 1 },
    params: { ...HERO_BG },
  });
  const [supported, setSupported] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Localiza stage + contenido desde el DOM (la sección es server).
  const locate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return null;
    const wrap = canvas.parentElement;
    return {
      wrap,
      text: wrap.querySelector(".section-content"),
      h1: wrap.querySelector("h1"),
    };
  };

  useEffect(() => {
    simRef.current.reducedFlag = reduced;
    simRef.current.staticRendered = false;
  }, [reduced]);

  // 1) prefers-reduced-motion del SO (con listener de cambio).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 2) Dimensionado + cachés + observers (solo cliente).
  useEffect(() => {
    const canvas = canvasRef.current;
    const els = locate();
    if (!canvas || !els) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSupported(false);
      return;
    }
    const { wrap } = els;
    let regenTimer = null;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const p0 = simRef.current.params;
      const dpr = Math.min(window.devicePixelRatio || 1, p0.dprCap);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const c2 = canvas.getContext("2d");
      if (!c2) {
        setSupported(false);
        return;
      }
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.size = { w, h, dpr };
      simRef.current.bg = buildBg(c2, w, h, p0.bgMode);
      simRef.current.shade = buildShade(
        c2,
        w,
        h,
        p0.shadowColor,
        p0.shadowFuerza,
        p0.shadowExt,
        p0.shadowSuav,
        p0.shadowCX,
        p0.shadowCY
      );
      regen();
    };

    const regen = () => {
      const { w, h } = simRef.current.size;
      if (!w || !h) return;
      const p = simRef.current.params;
      const els2 = locate();
      const zone =
        (els2 && measureZone(els2.wrap, els2.text, els2.h1, w, h)) ??
        simRef.current.zone ??
        fallbackZone(w, h);
      simRef.current.zone = zone;
      const { pieces, clusters } = makeField({
        w,
        h,
        seed: p.seed,
        palette: PALETTES[p.paletteId],
        count: p.count,
        auto: p.auto,
        densityPct: p.density,
        sizePct: p.sizePct,
        geometry: p.geometry,
        protection: p.protection,
        rotSpreadDeg: p.rotSpread,
        zone,
      });
      simRef.current.pieces = pieces;
      simRef.current.clusters = clusters;
      simRef.current.staticRendered = false;
    };

    resize();
    const ro = new ResizeObserver(() => {
      clearTimeout(regenTimer);
      regenTimer = setTimeout(resize, 150);
    });
    ro.observe(wrap);
    const els3 = locate();
    if (els3 && els3.text) ro.observe(els3.text);

    const io = new IntersectionObserver(
      (entries) => {
        simRef.current.visible = entries[0].isIntersecting;
      },
      { rootMargin: "200px" }
    );
    io.observe(canvas);

    return () => {
      clearTimeout(regenTimer);
      ro.disconnect();
      io.disconnect();
    };
    // Configuración fija de producción: sin dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Loop de animación (o frame estático único con reduced-motion).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const isStatic = () => simRef.current.reducedFlag;

    const tick = (now) => {
      const sim = simRef.current;
      const { w, h } = sim.size;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!sim.visible || document.hidden || !sim.bg) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (isStatic()) {
        if (!sim.staticRendered) {
          drawFrame(ctx, sim, 0, 0.6);
          sim.staticRendered = true;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      sim.staticRendered = false;
      const t = now / 1000;
      const sp = sim.params.speed;
      for (const p of sim.pieces) {
        p.x += p.vx * sp * dt;
        p.y += p.vy * sp * dt;
        const m = Math.max(w, h) * 0.15 + p.s;
        if (p.x < -m) p.x += w + m * 2;
        if (p.x > w + m) p.x -= w + m * 2;
        if (p.y < -m) p.y += h + m * 2;
        if (p.y > h + m) p.y -= h + m * 2;
      }
      drawFrame(ctx, sim, t, null);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback sin Canvas: solo halo sobre el fondo CSS de .hero.
  return (
    <>
      {supported && (
        <canvas ref={canvasRef} aria-hidden="true" className="hero-canvas" />
      )}
      {HERO_BG.halo && (
        <div
          className="hero-halo"
          aria-hidden="true"
          style={{ opacity: HERO_BG.haloStrength / 100 }}
        />
      )}
    </>
  );
}

"use client";

/*
 * Fondo vivo global (base §5): un único canvas fijo a viewport detrás de
 * todo, con el mismo motor/píxeles de la fase hero (v7, semilla 12).
 * Andamiaje: faseActiva + progreso por scroll, morph de paleta (no-op en
 * base: las 4 fases usan cálida), safe zones por sección (la generación usa
 * la del hero para equivalencia exacta), sin pausa offscreen (siempre
 * visible; se conserva visibilitychange y reduced-motion por fase).
 */

import { useEffect, useRef, useState } from "react";
import { HERO_BG } from "./hero-config";
import {
  PALETTES,
  PHASES,
  getPhaseForScroll,
  makeField,
  drawFrame,
  renderStaticLayers,
  measureZone,
  fallbackZone,
} from "./hero-field";
import "./hero-background.css";

export default function HeroBackground() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const simRef = useRef({
    pieces: [],
    clusters: [],
    visible: true,
    staticRendered: false,
    reducedFlag: false,
    layers: null,
    zone: null,
    zones: [],
    offsets: [],
    phase: { index: 0, id: PHASES[0].id, progress: 0 },
    size: { w: 0, h: 0, dpr: 1 },
    params: { ...HERO_BG },
  });
  const [supported, setSupported] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Secciones + contenidos (la sección hero sigue siendo server, sin refs).
  const locateSections = () => {
    const sections = Array.from(
      document.querySelectorAll("section.section")
    );
    return sections.map((sec) => ({
      sec,
      text: sec.querySelector(".section-content"),
      h1: sec.querySelector("h1"),
    }));
  };

  const cacheOffsets = (sections) => {
    const y = window.scrollY;
    return sections.map(({ sec }) => {
      const r = sec.getBoundingClientRect();
      const top = r.top + y;
      return { top, bottom: top + Math.max(1, sec.offsetHeight) };
    });
  };

  const publishPhase = (phase) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.dataset.phase = phase.id;
      canvas.dataset.progress = String(Math.round(phase.progress * 100));
    }
    if (document.body) {
      document.body.dataset.phase = phase.id;
      document.body.dataset.progress = String(
        Math.round(phase.progress * 100)
      );
    }
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

  // 2) Dimensionado viewport + cachés + driver de fase (solo cliente).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSupported(false);
      return;
    }
    let regenTimer = null;
    let scrollTicking = false;
    let scrollRaf = 0;

    const updatePhaseFromScroll = () => {
      scrollTicking = false;
      const sim = simRef.current;
      const vh = window.innerHeight;
      const phase = getPhaseForScroll(window.scrollY, sim.offsets, vh);
      sim.phase = phase;
      publishPhase(phase);
    };

    const queuePhaseUpdate = () => {
      if (!scrollTicking) {
        scrollTicking = true;
        scrollRaf = requestAnimationFrame(updatePhaseFromScroll);
      }
    };

    const resize = () => {
      // Fijo a viewport: clientWidth excluye scrollbar e iguala el ancho
      // full-bleed previo del hero (body 3em − hero −3em); alto 100vh.
      const w = Math.max(
        1,
        Math.floor(document.documentElement.clientWidth || window.innerWidth)
      );
      const h = Math.max(1, Math.floor(window.innerHeight));
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
      simRef.current.layers = renderStaticLayers(w, h, dpr, p0.bgMode, {
        color: p0.shadowColor,
        fuerza: p0.shadowFuerza,
        ext: p0.shadowExt,
        suav: p0.shadowSuav,
        cx: p0.shadowCX,
        cy: p0.shadowCY,
      });
      regen();
    };

    const regen = () => {
      const { w, h } = simRef.current.size;
      if (!w || !h) return;
      const p = simRef.current.params;
      const sections = locateSections();
      // Safe zones por sección (relativas a su propia sección: estables ante
      // scroll). La generación usa la del hero (índice 0) para equivalencia
      // exacta con v7; el resto queda cacheado para futuras fases.
      const zones = sections.map(({ sec, text, h1 }) => {
        if (!sec || !text || !h1) return null;
        return measureZone(sec, text, h1, w, h);
      });
      simRef.current.zones = zones;
      const heroZone =
        zones[0] ??
        simRef.current.zone ??
        fallbackZone(w, h);
      simRef.current.zone = heroZone;
      simRef.current.offsets = cacheOffsets(sections);
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
        zone: heroZone,
      });
      simRef.current.pieces = pieces;
      simRef.current.clusters = clusters;
      simRef.current.staticRendered = false;
      updatePhaseFromScroll();
    };

    resize();
    const onResize = () => {
      clearTimeout(regenTimer);
      regenTimer = setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", queuePhaseUpdate, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            clearTimeout(regenTimer);
            regenTimer = setTimeout(resize, 150);
          })
        : null;
    if (ro && document.body) ro.observe(document.body);

    return () => {
      clearTimeout(regenTimer);
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", queuePhaseUpdate);
      if (ro) ro.disconnect();
    };
    // Configuración fija de producción: sin dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Loop de animación (o frame estático único con reduced-motion).
  // Sin pausa offscreen: el fondo global siempre está visible; solo se
  // respeta pestaña oculta. Física hero intacta para las 4 fases (base).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    const isStatic = () => simRef.current.reducedFlag;

    const tick = (now) => {
      const sim = simRef.current;
      const { w, h } = sim.size;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden || !sim.layers) {
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
      // Conducta hero (única en la base): deriva lineal con wrap.
      for (const p of sim.pieces) {
        p.x += p.vx * sp * dt;
        p.y += p.vy * sp * dt;
        const m = Math.max(w, h) * 0.15 + p.s;
        if (p.x < -m) p.x += w + m * 2;
        if (p.x > w + m) p.x -= w + m * 2;
        if (p.y < -m) p.y += h + m * 2;
        if (p.y > h + m) p.y -= h + m * 2;
      }
      // Presentación topada a 30fps (física intacta).
      if (now - lastPaint >= 1000 / 30) {
        drawFrame(ctx, sim, t, null);
        lastPaint = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback sin Canvas: solo halo sobre el fondo del wrapper fijo.
  return (
    <div ref={wrapRef} aria-hidden="true" className="global-background">
      {supported && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="hero-canvas"
          data-phase="hero"
          data-progress="0"
        />
      )}
      {HERO_BG.halo && (
        <div
          className="hero-halo"
          aria-hidden="true"
          style={{ opacity: HERO_BG.haloStrength / 100 }}
        />
      )}
    </div>
  );
}

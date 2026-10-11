"use client";

/*
 * Preloader A3 (referencia + original): velo de arranque con % honesto
 * ligado a hitos reales (montaje → fuentes → canvas del hero → load),
 * fundido de salida y `body[data-booted=1]` para E2E. Nunca atrapa al
 * usuario: tope forzoso a 4s y salto directo con reduced-motion.
 * Sin dependencias; el % se publica por DOM (sin re-renders por frame).
 */

import { useEffect, useRef, useState } from "react";
import "./preloader.css";

const MIN_MS = 500;
const MAX_MS = 4000;
const CREEP_CAP = 95;

export default function Preloader() {
  const rootRef = useRef(null);
  const numRef = useRef(null);
  const barRef = useRef(null);
  const hideTimer = useRef(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.dataset.booted = "1";
      document.body.dataset.progress = "100";
      setGone(true);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    let shown = 0;
    let last = 0;
    let finished = false;

    const target = (now) => {
      let m = 8;
      try {
        if (document.fonts && document.fonts.status === "loaded") m = Math.max(m, 45);
      } catch {
        // document.fonts puede no existir: se salta el hito sin romper.
      }
      if (document.querySelector("canvas.hero-canvas")) m = Math.max(m, 70);
      // Avance lento hasta el tope mientras load no termina.
      m = Math.max(m, Math.min(CREEP_CAP, 8 + (now - t0) / 25));
      if (document.readyState === "complete") m = 100;
      return m;
    };

    const paint = (n) => {
      const v = Math.floor(n);
      if (numRef.current) numRef.current.textContent = `${v}%`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${n / 100})`;
      root.dataset.progress = String(v);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      paint(100);
      root.classList.add("done");
      document.body.dataset.booted = "1";
      document.body.dataset.progress = "100";
      hideTimer.current = window.setTimeout(() => setGone(true), 350);
    };

    const tick = (now) => {
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const tg = target(now);
      shown += (tg - shown) * Math.min(1, dt * 6);
      paint(shown);
      if (now - t0 > MAX_MS) {
        finish();
        return;
      }
      if (shown > 99.4 && tg >= 100 && now - t0 > MIN_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (gone) return null;
  return (
    <div ref={rootRef} className="preloader" data-progress="0" aria-hidden="true">
      <p className="preloader-name">Horangel Millan</p>
      <p className="preloader-pct" ref={numRef}>0%</p>
      <div className="preloader-bar" aria-hidden="true">
        <span ref={barRef} />
      </div>
      <p className="preloader-legend">Cargando</p>
    </div>
  );
}

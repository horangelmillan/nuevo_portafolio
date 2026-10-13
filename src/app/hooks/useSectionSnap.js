"use client";

/*
 * Snap de scroll por secciones (decisión usuario 2026-10-11): cada gesto de
 * rueda baja/sube UNA sección (centrada, como la nav). El CSS puro
 * (`scroll-snap-type`) se descartó con medición: mandatory y proximity
 * devuelven las micro-ruedas y el scroll se atasca (avance 0). Esto es
 * jacking por JS con guards estrictos. Sin dependencias.
 *
 * Guards (lo que NO se secuestra): pinch-zoom (ctrlKey), rueda horizontal
 * (carrusel), panel del About (scroll interno), overlay abierto fuera del
 * panel (comportamiento nativo intacto), pre-boot, scrolls programáticos
 * (no generan wheel) y teclado/barra (nativos = accesibilidad).
 */

import { useEffect, useRef } from "react";
import useStore from "../store/store";

const LOCK_MS = 800;
// Umbral de disparo (antes 120): una muesca típica de rueda son ~100px, así
// que con 120 una muesca suave sola no disparaba y se sentía "fuerte".
// Con 80 la muesca normal dispara al instante; el lock evita el salto doble.
const ACCUM_PX = 80;
const IDLE_MS = 400;

function centerY(i) {
  const secs = document.querySelectorAll("section.section");
  const sec = secs[i];
  if (!sec) return null;
  const r = sec.getBoundingClientRect();
  return Math.max(0, r.top + window.scrollY + r.height / 2 - window.innerHeight / 2);
}

function nearestIdx() {
  const secs = document.querySelectorAll("section.section");
  const mid = window.scrollY + window.innerHeight / 2;
  let best = 0;
  let bd = Infinity;
  secs.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    const d = Math.abs(r.top + window.scrollY + r.height / 2 - mid);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return { best, count: secs.length };
}

export default function useSectionSnap() {
  const st = useRef({ lockUntil: 0, acc: 0, idleT: 0 });

  useEffect(() => {
    const reduce = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // go() mide nearestIdx() en vivo en cada salto: nunca hay índice
    // viejo que sincronizar (teclado/barra caen donde caigan y el próximo
    // salto parte de ahí).
    const go = (dir) => {
      const now = performance.now();
      if (now < st.current.lockUntil) return;
      const { best, count } = nearestIdx();
      const next = Math.max(0, Math.min(count - 1, best + dir));
      const y = centerY(next);
      if (y === null) return;
      st.current.acc = 0;
      st.current.lockUntil = now + LOCK_MS;
      window.scrollTo({ top: y, behavior: reduce() ? "auto" : "smooth" });
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return;
      if (document.body.dataset.booted !== "1") return;
      const st8 = useStore.getState();
      if (st8.isAboutOpen || st8.caseView) return;
      if (e.target && e.target.closest && e.target.closest(".about-panel")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < st.current.lockUntil) {
        st.current.acc = 0;
        return;
      }
      if (now - st.current.idleT > IDLE_MS) st.current.acc = 0;
      st.current.idleT = now;
      st.current.acc += e.deltaY;
      if (st.current.acc >= ACCUM_PX) go(1);
      else if (st.current.acc <= -ACCUM_PX) go(-1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
    };
  }, []);
}

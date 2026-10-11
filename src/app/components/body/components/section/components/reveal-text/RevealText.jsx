"use client";

/*
 * RevealText: párrafo con revelado por scroll palabra a palabra (0.15 → 1
 * según la posición del párrafo en el viewport). Implementación original,
 * sin dependencias: el patrón estándar 2026 (Motion/GSAP) con rAF-throttle
 * propio + IntersectionObserver (solo trabaja visible). Accesible: texto
 * íntegro en aria-label, spans visuales aria-hidden. Sin JS o con
 * reduced-motion el texto se muestra completo (CSS por defecto opaco).
 */

import { useEffect, useRef } from "react";
import "./RevealText.css";

const DIM = 0.15;
const SPREAD = 0.7;
const WINDOW = 0.3;

function tokenize(text, accents, links) {
  // Divide en segmentos { t, accent, href } partiendo por frases marcadas
  // (acentos y links; la más larga primero para no partir parciales).
  const marks = [
    ...accents.map((phrase) => ({ phrase, accent: true, href: links[phrase] })),
    ...Object.entries(links).map(([phrase, href]) => ({ phrase, accent: true, href })),
  ].sort((a, b) => b.phrase.length - a.phrase.length);
  const seen = new Set();
  const segs = [{ t: text, accent: false, href: null }];
  for (const { phrase, href } of marks) {
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].href) continue;
      const at = segs[i].t.indexOf(phrase);
      if (at === -1) continue;
      const before = segs[i].t.slice(0, at);
      const after = segs[i].t.slice(at + phrase.length);
      const next = [];
      if (before) next.push({ t: before, accent: false, href: null });
      next.push({ t: phrase, accent: true, href: href || null });
      if (after) next.push({ t: after, accent: false, href: null });
      segs.splice(i, 1, ...next);
      break;
    }
  }
  return segs;
}

export function wordOpacity(p, index, count) {
  const start = (index / Math.max(1, count)) * SPREAD;
  const local = Math.max(0, Math.min(1, (p - start) / WINDOW));
  return DIM + (1 - DIM) * local;
}

export default function RevealText({ text, accents = [], links = {}, className = "" }) {
  const ref = useRef(null);
  const segs = tokenize(text, accents, links);
  let key = 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spans = Array.from(el.querySelectorAll(":scope > [data-w]"));
    if (spans.length === 0) return;
    let raf = 0;
    let ticking = false;
    let onScroll = null;

    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 cuando el centro del párrafo roza el borde inferior, 1 ya en el
      // centro o más arriba (al leer centrado, todo iluminado).
      const start = vh * 0.95;
      const end = vh * 0.55;
      const pos = r.top + r.height / 2;
      const p = Math.max(0, Math.min(1, (start - pos) / (start - end)));
      const n = spans.length;
      for (let i = 0; i < n; i++) {
        spans[i].style.opacity = String(wordOpacity(p, i, n));
      }
    };

    const queue = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        if (vis) {
          update();
          if (!onScroll) {
            onScroll = () => queue();
            window.addEventListener("scroll", onScroll, { passive: true });
          }
        } else if (onScroll) {
          window.removeEventListener("scroll", onScroll);
          onScroll = null;
        }
      },
      { threshold: 0 }
    );
    io.observe(el);
    window.addEventListener("resize", queue);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", queue);
      if (onScroll) window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Sin aria-label/aria-hidden: los spans son texto corrido y los lectores
  // lo leen en orden natural (la opacidad no les afecta); el link es real.
  return (
    <p ref={ref} className={`reveal-text ${className}`}>
      {segs.flatMap((seg) =>
        seg.t.split(/(\s+)/).map((tok) => {
          if (!tok) return null;
          if (/^\s+$/.test(tok)) return tok;
          const k = key++;
          if (seg.href) {
            return (
              <a key={k} data-w data-a href={seg.href} target="_blank" rel="noreferrer">
                {tok}
              </a>
            );
          }
          return (
            <span key={k} data-w data-a={seg.accent || undefined}>
              {tok}
            </span>
          );
        })
      )}
    </p>
  );
}

"use client";

/*
 * Carrusel horizontal de proyectos (A1): drag con inercia + rueda
 * horizontal + flechas + escala/opacidad por proximidad al centro.
 * Implementación original sobre Pointer Events (cubre mouse + touch).
 * Sin dependencias nuevas. Sin estado React por frame: todo vive en refs
 * y se publica al DOM vía dataset (como el sim del HeroBackground).
 *
 * La rueda VERTICAL se deja pasar al scroll de página a propósito: este
 * carrusel no ocupa toda la pantalla y secuestrarla rompería el scroll
 * nativo que el proyecto conserva (ver docs/ESTADO.md: scroll-hijack).
 */

import { useEffect, useRef } from "react";
import useStore from "@/app/store/store";
import { CAROUSEL_ITEMS, PHYS } from "./carousel-config";
import {
  clamp,
  easeInOutQuart,
  stepInertia,
  proximity,
  cardScale,
  cardOpacity,
  nearestIndex,
} from "./carousel-physics";
import "./project-carousel.css";

export default function ProjectCarousel({ items = CAROUSEL_ITEMS }) {
  const rootRef = useRef(null);
  const viewRef = useRef(null);
  const trackRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const goRef = useRef(() => {});
  const selectRef = useRef(() => {});
  const simRef = useRef({
    x: 0,
    v: 0,
    dragging: false,
    moved: 0,
    lastX: 0,
    lastT: 0,
    raf: 0,
    running: false,
    tween: null,
    centers: [],
    min: 0,
    max: 0,
    viewW: 0,
    active: -1,
    reduced: false,
  });

  useEffect(() => {
    const root = rootRef.current;
    const view = viewRef.current;
    const track = trackRef.current;
    if (!root || !view || !track) return;
    const sim = simRef.current;
    const cards = () =>
      Array.from(track.children).filter((el) => el.classList.contains("carousel-card"));
    const spacer = () => track.querySelector(":scope > .carousel-spacer");

    const measure = () => {
      const els = cards();
      sim.viewW = view.clientWidth;
      // Espaciador final = mitad del viewport menos media tarjeta: con él,
      // la última tarjeta también puede centrarse (el padding-% derecho
      // colapsa en overflow; el ::after resolvía mal su %).
      const sp = spacer();
      if (sp && els[0]) {
        sp.style.width = `${Math.max(0, sim.viewW / 2 - els[0].offsetWidth / 2)}px`;
      }
      sim.centers = els.map((el) => el.offsetLeft + el.offsetWidth / 2);
      const trackW = track.scrollWidth;
      sim.min = Math.min(0, sim.viewW - trackW);
      sim.max = 0;
      sim.x = clamp(sim.x, sim.min, sim.max);
    };

    const publish = () => {
      const viewCenter = sim.viewW / 2;
      track.style.transform = `translate3d(${sim.x}px,0,0)`;
      track.dataset.offset = String(Math.round(sim.x));
      track.dataset.settled = !sim.tween && !sim.dragging && sim.v === 0 ? "1" : "0";
      const els = cards();
      const idx = nearestIndex(sim.centers, sim.x, viewCenter);
      if (idx !== sim.active) {
        sim.active = idx;
        root.dataset.activeIndex = String(idx);
      }
      for (let i = 0; i < els.length; i++) {
        const prox = proximity(sim.centers[i] + sim.x, viewCenter, sim.viewW);
        els[i].style.transform = `scale(${cardScale(prox, PHYS.minScale, PHYS.maxScale).toFixed(3)})`;
        els[i].style.opacity = String(cardOpacity(prox, PHYS.minOpacity).toFixed(3));
        els[i].dataset.active = i === sim.active ? "true" : "false";
      }
      if (prevRef.current) prevRef.current.disabled = idx <= 0;
      if (nextRef.current) nextRef.current.disabled = idx >= els.length - 1;
    };

    const loop = (now) => {
      if (sim.tween) {
        const tw = sim.tween;
        const t = (now - tw.start) / tw.dur;
        if (t >= 1) {
          sim.x = tw.to;
          sim.tween = null;
        } else {
          sim.x = tw.from + (tw.to - tw.from) * easeInOutQuart(t);
        }
        sim.v = 0;
      } else if (!sim.dragging && sim.v !== 0) {
        const dt = Math.min(50, now - (sim.lastTick || now));
        const r = stepInertia(sim.x, sim.v, dt, PHYS.friction, PHYS.stopVel, sim.min, sim.max);
        sim.x = r.x;
        sim.v = r.v;
      }
      sim.lastTick = now;
      publish();
      const settled = !sim.tween && !sim.dragging && sim.v === 0;
      if (settled) {
        sim.running = false;
        sim.raf = 0;
        return;
      }
      sim.raf = requestAnimationFrame(loop);
    };

    const ensureLoop = () => {
      if (!sim.running) {
        sim.running = true;
        sim.lastTick = 0;
        sim.raf = requestAnimationFrame(loop);
      }
    };

    const goTo = (idx) => {
      if (sim.dragging) return; // la flecha/teclado no compite con un drag activo
      const els = cards();
      const target = clamp(
        sim.viewW / 2 - sim.centers[clamp(idx, 0, els.length - 1)],
        sim.min,
        sim.max
      );
      sim.tween = null;
      sim.v = 0;
      if (sim.reduced) {
        sim.x = target;
        publish();
        return;
      }
      sim.tween = { from: sim.x, to: target, start: performance.now(), dur: PHYS.arrowMs };
      ensureLoop();
    };
    goRef.current = (step) => goTo(sim.active + step);
    // Click/teclado en activa abre el caso EN EL MISMO SITIO (overlay, sin
    // redirección: decisión usuario); en otra la centra.
    selectRef.current = (i) => {
      const item = items[i];
      if (i === sim.active) useStore.getState().setCaseView({ slug: item.slug, idx: i, mode: "expand" });
      else goTo(i);
    };

    const onDown = (e) => {
      sim.dragging = true;
      sim.tween = null;
      sim.v = 0;
      sim.moved = 0;
      // Tarjeta bajo el press (solo un tap press+release en la MISMA
      // tarjeta abre/centra; si se suelta en otra parte es snap).
      const downEl = e.target && e.target.closest ? e.target.closest(".carousel-card[data-index]") : null;
      sim.downCard = downEl ? downEl.dataset.index : null;
      sim.lastX = e.clientX;
      sim.lastT = performance.now();
      try {
        view.setPointerCapture(e.pointerId);
      } catch {
        // Sin captura: el drag sigue funcionando con los moves en el viewport.
      }
      view.classList.add("grabbing");
    };

    const onMove = (e) => {
      if (!sim.dragging) return;
      const now = performance.now();
      const dx = e.clientX - sim.lastX;
      const dt = Math.max(1, now - sim.lastT);
      // Velocidad suavizada en px/frame (@60fps), como la deriva del hero.
      const inst = (dx / dt) * 16.667;
      sim.v = sim.v * 0.7 + inst * 0.3;
      sim.moved += Math.abs(dx);
      sim.lastX = e.clientX;
      sim.lastT = now;
      // Bordes con rubber-band: ceden con resistencia en vez de clavarse.
      // La velocidad se conserva para que el flick de vuelta responda.
      let nx = sim.x + dx;
      if (nx < sim.min) {
        nx = Math.max(sim.min - PHYS.overshoot, sim.min + (nx - sim.min) * PHYS.rubber);
      } else if (nx > sim.max) {
        nx = Math.min(sim.max + PHYS.overshoot, sim.max + (nx - sim.max) * PHYS.rubber);
      }
      sim.x = nx;
      publish();
    };

    const onUp = (e) => {
      if (!sim.dragging) return;
      sim.dragging = false;
      view.classList.remove("grabbing");
      // Tap (sin arrastre): el onClick del navegador NO sirve aquí porque la
      // captura reorienta el up a la vista; se resuelve la tarjeta por
      // geometría. Misma regla que el teclado: activa abre, otra centra
      // (vía el snap de abajo).
      if (sim.moved <= 8 && e && typeof e.clientX === "number") {
        const under =
          typeof document.elementFromPoint === "function"
            ? document.elementFromPoint(e.clientX, e.clientY)
            : null;
        const card = under && under.closest ? under.closest(".carousel-card[data-index]") : null;
        if (card && card.dataset.index === sim.downCard) {
          const i = Number(card.dataset.index);
          const item = items[i];
          sim.v = 0;
          sim.tween = null;
          if (i === sim.active) {
            if (item) useStore.getState().setCaseView({ slug: item.slug, idx: i, mode: "expand" });
          } else {
            // Tap en inactiva: tween directo a centrarla (el snap de abajo
            // centraría la más cercana, no la pulsada).
            goTo(i);
          }
          return;
        }
      }
      // Snap al centro: la tarjeta más cercana (o la siguiente en la
      // dirección del flick) se centra sola con tween. Sin inercia libre.
      const els = cards();
      let idx = nearestIndex(sim.centers, sim.x, sim.viewW / 2);
      if (!sim.reduced && Math.abs(sim.v) > PHYS.flickVel) {
        idx += sim.v > 0 ? -1 : 1;
      }
      idx = clamp(idx, 0, els.length - 1);
      const target = clamp(sim.viewW / 2 - sim.centers[idx], sim.min, sim.max);
      sim.v = 0;
      sim.tween = null;
      if (sim.reduced || Math.abs(target - sim.x) < 0.5) {
        sim.x = target;
        publish();
        return;
      }
      sim.tween = { from: sim.x, to: target, start: performance.now(), dur: PHYS.snapMs };
      ensureLoop();
    };

    // Solo la rueda HORIZONTAL (trackpads): la vertical es del page scroll.
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      sim.tween = null;
      sim.v = 0;
      sim.x = clamp(sim.x - e.deltaX * PHYS.wheelGain, sim.min, sim.max);
      publish();
    };

    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goRef.current(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goRef.current(-1);
      }
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      sim.reduced = mq.matches;
    };
    syncReduced();

    const onResize = () => {
      measure();
      publish();
    };

    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp);
    view.addEventListener("pointercancel", onUp);
    // Red: si setPointerCapture falló, el pointerup puede caer fuera del
    // view y dejar dragging trabado → onUp también a nivel window.
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    view.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", syncReduced);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(onResize).catch(() => {});
    }
    measure();
    publish();

    return () => {
      cancelAnimationFrame(sim.raf);
      sim.running = false;
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
      view.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      view.removeEventListener("wheel", onWheel);
      root.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", syncReduced);
    };
    // Montaje único: todo el estado vive en refs (patrón HeroBackground).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      className="carousel"
      data-active-index="0"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Proyectos destacados"
      tabIndex={0}
    >
      <div ref={viewRef} className="carousel-view">
        <ul ref={trackRef} className="carousel-track" data-offset="0" data-settled="1">
          {items.map((it, i) => (
            <li
              key={it.title}
              className="carousel-card"
              data-index={i}
              style={{ "--accent": it.color }}
              role="button"
              tabIndex={0}
              aria-label={`Abrir caso: ${it.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectRef.current(i);
                }
              }}
            >
              <span className="carousel-accent" aria-hidden="true" />
              <h3>{it.title}</h3>
              <p className="carousel-context">{it.context}</p>
              <p className="carousel-status">{it.status}</p>
            </li>
          ))}
          <li className="carousel-spacer" aria-hidden="true" />
        </ul>
      </div>
      <button
        ref={prevRef}
        type="button"
        className="carousel-ctrl left"
        aria-label="Proyecto anterior"
        onClick={() => goRef.current(-1)}
      >
        ‹
      </button>
      <button
        ref={nextRef}
        type="button"
        className="carousel-ctrl right"
        aria-label="Proyecto siguiente"
        onClick={() => goRef.current(1)}
      >
        ›
      </button>
    </div>
  );
}

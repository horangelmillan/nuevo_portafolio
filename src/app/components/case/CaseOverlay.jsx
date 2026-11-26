"use client";

/*
 * Overlay de caso SIN redirección (decisión usuario: el contenido vive detrás
 * de la sección, sin recargas). Flujo ÚNICO: tap → todo bloqueado durante el
 * expand (1s Circ.easeInOut — evidencia `expend()`) → página del caso →
 * pill "Volver" (sticky) para regresar. Hoja: título Outfit + meta Cinzel +
 * galería redondeada + bloques con visual SVG propio + enlace. El blob
 * expandido transparenta su color hasta fondo plano al cubrir.
 * Patrones del About: foco con retorno, ESC, trampa Tab.
 */

import { useEffect, useRef, useState } from "react";
import useStore from "@/app/store/store";
import { outfit, cinzel } from "@/app/fonts";
import { CASES } from "./cases";
import CaseVisual from "./CaseVisual";
import "./case-overlay.css";
import "./case-visual.css";

const MORPH_MS = 1000;
const CLOSE_MS = 800;
// Al cerrar, la hoja sale primero y el blob encoje después: el morph de
// vuelta se ve completo, sin solape que parezca re-crecimiento.
const SHEET_OUT_MS = 250;

export default function CaseOverlay() {
  const caseView = useStore((s) => s.caseView);
  const [phase, setPhase] = useState("idle");
  const closeRef = useRef(null);
  const wasOpen = useRef(false);
  const prevFocus = useRef(null);
  const timers = useRef([]);

  const item = caseView ? CASES[caseView.slug] : null;
  const open = phase === "expanding" || phase === "open" || phase === "closing";
  // Cortina: la clase vive en la PROPIA sección (padre directo, estable:
  // el canvas ya no se reubica), no en body. Solo el contenido de
  // Proyectos se desvanece; el resto de la página no se toca.
  const sectionEl = () =>
    document.querySelector(".case-overlay")?.parentElement ?? null;

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  // Seguridad: ningún timer pendiente sobrevive al cerrar.
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // R2: con el caso abierto el scroll principal muere (rueda, teclado,
  // touch, scrollbar); al cerrar se restaura la posición exacta.
  // OJO medido (E2E): `overflow:hidden` en root resetea scrollY a 0 en esta
  // página → se usa bloqueo por `position:fixed` con offset preservado.
  const lockScroll = () => {
    const bd = document.body;
    if (bd.dataset.caseScroll) return;
    const y = window.scrollY;
    // Tirón lateral: si hay scrollbar CLÁSICO ocupando espacio, al fijar el
    // body desaparece y el viewport se ensancha (medido 10px: el contenido
    // full-bleed + canvas se estiran a la derecha al abrir y vuelven al
    // cerrar). Se compensa con padding-right exacto (body es border-box
    // global: la caja de contenido vuelve a su ancho y nada se mueve). En
    // overlay (móvil/Mac: sbw 0) es no-op. Se mide ANTES de fijar.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    // JSON (no "a|b|c"): ningún valor con "|" lo rompe.
    bd.dataset.caseScroll = JSON.stringify({
      y,
      position: bd.style.position || "",
      top: bd.style.top || "",
      width: bd.style.width || "",
      paddingRight: bd.style.paddingRight || "",
    });
    bd.style.position = "fixed";
    bd.style.top = `-${y}px`;
    bd.style.width = "100%";
    if (sbw > 0) bd.style.paddingRight = `${sbw}px`;
  };
  const unlockScroll = () => {
    const bd = document.body;
    const raw = bd.dataset.caseScroll;
    if (raw === undefined) return;
    // Compat con el formato previo "a|b|c" (misma sesión, por si acaso).
    let y = 0, position = "", top = "", width = "", paddingRight = "";
    try {
      ({ y = 0, position = "", top = "", width = "", paddingRight = "" } = JSON.parse(raw));
    } catch {
      [y, position, top, width, paddingRight] = raw.split("|");
    }
    bd.style.position = position;
    bd.style.top = top;
    bd.style.width = width;
    bd.style.paddingRight = paddingRight;
    delete bd.dataset.caseScroll;
    // instant: la página usa scroll-behavior:smooth y el restore debe ser
    // un salto exacto, no una animación que deje scrollY a mitad de vuelo.
    window.scrollTo({ top: Number(y) || 0, behavior: "instant" });
  };

  // La hoja nace con scroll (E2E: aparece ya en el tope del bloque 1 y
  // el botón cerrar queda fuera de pantalla). Se resetea al montar y al
  // abrir: el caso siempre empieza por el título.
  const resetSheet = () => {
    document.querySelector(".case-overlay .case-sheet")?.scrollTo(0, 0);
  };

  // Apertura: el BLOB ÚNICO se expande; al cubrir (1s) entra la hoja.
  // Sin fotos ya no hay settle que esperar. Con reduced-motion, directo.
  useEffect(() => {
    if (caseView && !wasOpen.current) {
      wasOpen.current = true;
      prevFocus.current = document.activeElement;
      sectionEl()?.classList.add("case-open");
      lockScroll();
      resetSheet();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      useStore.getState().setCaseView({ ...caseView, mode: "expand" });
      if (reduced) {
        useStore.getState().setCaseView({ ...caseView, mode: "cover" });
        setPhase("open");
        resetSheet();
        closeRef.current?.focus({ preventScroll: true });
      } else {
        setPhase("expanding");
        later(() => {
          if (!wasOpen.current) return;
          const cv = useStore.getState().caseView;
          if (cv) useStore.getState().setCaseView({ ...cv, mode: "cover" });
          setPhase("open");
          resetSheet();
          closeRef.current?.focus({ preventScroll: true });
        }, MORPH_MS);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseView?.slug]);

  // Flujo único: cerrar SOLO desde abierto. Durante el expand todo está
  // bloqueado (botón sin pointer-events + ESC inactivo). Al cerrar, la hoja
  // sale primero y el blob encoje después desde el 100%, visible y sin
  // volver a crecer.
  const close = () => {
    if (phase !== "open") return;
    clearTimers();
    wasOpen.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = useStore.getState().caseView;
    if (reduced || !cv) {
      useStore.getState().setCaseView(null);
      setPhase("idle");
      sectionEl()?.classList.remove("case-open");
      unlockScroll();
      if (prevFocus.current instanceof HTMLElement) {
        prevFocus.current.focus({ preventScroll: true });
      }
      prevFocus.current = null;
      return;
    }
    setPhase("closing");
    later(() => {
      const cv2 = useStore.getState().caseView;
      if (cv2) useStore.getState().setCaseView({ ...cv2, mode: "collapse" });
    }, SHEET_OUT_MS);
    later(() => {
      useStore.getState().setCaseView(null);
      setPhase("idle");
      sectionEl()?.classList.remove("case-open");
      unlockScroll();
      if (prevFocus.current instanceof HTMLElement) {
        prevFocus.current.focus({ preventScroll: true });
      }
      prevFocus.current = null;
    }, SHEET_OUT_MS + CLOSE_MS);
  };

  // ESC + trampa Tab (solo abierto: flujo único).
  useEffect(() => {
    if (phase !== "open") return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = document.querySelector(".case-overlay .case-sheet");
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll("button:not([disabled]), a[href]")
      ).filter((el) => el.tabIndex !== -1);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!caseView || !item) return null;
  return (
    <div
      className={`case-overlay phase-${phase}`}
      aria-hidden={phase === "idle"}
      data-phase={phase}
      data-color={item.color}
    >
      <div
        className="case-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Caso: ${item.title}`}
        style={{ opacity: phase === "open" ? undefined : 0 }}
      >
        <div className="case-topbar">
          <button
            ref={closeRef}
            type="button"
            className={`case-close ${outfit.className}`}
            aria-label="Volver a proyectos"
            onClick={close}
            tabIndex={phase === "open" ? 0 : -1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver
          </button>
        </div>
        <span className="case-accent" aria-hidden="true" style={{ background: item.color }} />
        <h2 className={outfit.className}>{item.title}</h2>
        <p className={`case-meta ${cinzel.className}`}>
          {item.context} · {item.date} · {item.role}
        </p>
        {Array.isArray(item.media) && item.media.length > 0 && (
          <div className="case-media" aria-label={`Imágenes de ${item.title}`}>
            {item.media.map((m, i) => (
              <figure key={i} className="case-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.alt || `${item.title} ${i + 1}`} loading="lazy" />
                {m.caption && <figcaption className={outfit.className}>{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        {item.blocks.map((b, i) => (
          <section key={i} className="case-block">
            <div className="case-block-text">
              <h3 className={cinzel.className}>{b.heading}</h3>
              <p className={outfit.className}>{b.body}</p>
            </div>
            {b.visual && <CaseVisual kind={b.visual} />}
          </section>
        ))}
        {item.siteUrl && (
          <a className={`case-link ${outfit.className}`} href={item.siteUrl} target="_blank" rel="noreferrer" tabIndex={phase === "open" ? 0 : -1}>
            Visitar sitio en vivo →
          </a>
        )}
      </div>
    </div>
  );
}

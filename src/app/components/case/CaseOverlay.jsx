"use client";

/*
 * Overlay de caso SIN redirección (decisión usuario: el contenido vive detrás
 * de la sección, sin recargas). Flujo ÚNICO: tap → todo bloqueado durante el
 * expand (1s Circ.easeInOut — evidencia `expend()`) → página del caso →
 * botón cerrar para volver. Sin fotos en la hoja (decisión usuario: él las
 * posiciona): título + descripción + bloques + enlace. El blob expandido
 * transparenta su color hasta fondo plano al cubrir.
 * Patrones del About: foco con retorno, ESC, trampa Tab.
 */

import { useEffect, useRef, useState } from "react";
import useStore from "@/app/store/store";
import { CASES } from "./cases";
import "./case-overlay.css";

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
    bd.dataset.caseScroll = `${y}|${bd.style.position || ""}|${bd.style.top || ""}|${bd.style.width || ""}`;
    bd.style.position = "fixed";
    bd.style.top = `-${y}px`;
    bd.style.width = "100%";
  };
  const unlockScroll = () => {
    const bd = document.body;
    const saved = bd.dataset.caseScroll;
    if (saved === undefined) return;
    const [y, position, top, width] = saved.split("|");
    bd.style.position = position;
    bd.style.top = top;
    bd.style.width = width;
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

  // Snap por bloques con rueda (solo abierto): una muesca = un bloque.
  // Mismo patrón que useSectionSnap de la home (umbral + lock); el teclado
  // y el touch quedan nativos (accesibilidad). Sin loops nuevos.
  useEffect(() => {
    if (phase !== "open") return;
    const sheet = document.querySelector(".case-overlay .case-sheet");
    if (!sheet) return;
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Sin lock por tiempo (tragaba muescas si el smooth tardaba más que el
    // lock, medido en móvil): guarda de viaje — se ignora la rueda mientras
    // la hoja viaja a su tope; al llegar se libera por evento scroll.
    const st = { acc: 0, idleT: 0, target: null };
    const stops = () =>
      Array.from(sheet.children)
        .filter((el) => getComputedStyle(el).scrollSnapAlign !== "none")
        .map(
          (el) =>
            el.offsetTop -
            (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)
        )
        .sort((a, b) => a - b);
    const onWheel = (e) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - st.idleT > 1200) {
        st.acc = 0;
        st.target = null;
      }
      // Viajando a un tope: la muesca se ignora (llega tras asentar).
      if (st.target !== null && Math.abs(sheet.scrollTop - st.target) > 8) {
        return;
      }
      st.target = null;
      if (now - st.idleT > 400) st.acc = 0;
      st.idleT = now;
      st.acc += e.deltaY;
      if (Math.abs(st.acc) < 80) return;
      const dir = st.acc > 0 ? 1 : -1;
      st.acc = 0;
      const cur = sheet.scrollTop;
      const ss = stops();
      const next =
        dir > 0
          ? ss.find((s) => s > cur + 10)
          : [...ss].reverse().find((s) => s < cur - 10);
      // El último tope puede superar el scroll máximo (link cerca del
      // fondo): se topa para no pedir un imposible que se queda a medias.
      const maxTop = sheet.scrollHeight - sheet.clientHeight;
      st.target =
        next === undefined
          ? dir > 0
            ? maxTop
            : 0
          : Math.min(next, maxTop);
      sheet.scrollTo({
        top: st.target,
        behavior: reduced() ? "auto" : "smooth",
      });
    };
    const onScroll = () => {
      if (st.target !== null && Math.abs(sheet.scrollTop - st.target) <= 8) {
        st.target = null;
      }
    };
    sheet.addEventListener("wheel", onWheel, { passive: false });
    sheet.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sheet.removeEventListener("wheel", onWheel);
      sheet.removeEventListener("scroll", onScroll);
    };
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
        <button
          ref={closeRef}
          type="button"
          className="case-close"
          aria-label="Cerrar caso"
          onClick={close}
          tabIndex={phase === "open" ? 0 : -1}
        >
          <span aria-hidden="true">×</span> cerrar
        </button>
        <span className="case-accent" aria-hidden="true" style={{ background: item.color }} />
        <h2>{item.title}</h2>
        <p className="case-meta">
          {item.context} · {item.date} · {item.role}
        </p>
        {item.blocks.map((b, i) => (
          <section key={i} className="case-block">
            <h3>{b.heading}</h3>
            <p>{b.body}</p>
          </section>
        ))}
        {item.siteUrl && (
          <a className="case-link" href={item.siteUrl} target="_blank" rel="noreferrer" tabIndex={phase === "open" ? 0 : -1}>
            Visitar sitio en vivo →
          </a>
        )}
      </div>
    </div>
  );
}

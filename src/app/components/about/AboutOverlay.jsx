"use client";

/*
 * Overlay About A3 (referencia + original): panel con bio, enlaces y fila
 * de copiar-email, cierre por botón, backdrop y ESC. Debajo de la nav
 * (z 9000 < 9999) para no secuestrarla. Sin dependencias.
 */

// TODO(usuario): tu email real para la fila de copiar. Sin él la fila copia
// este marcador (no invento tu dirección).
export const CONTACT_EMAIL = "horangelmillan@gmail.com";

import { useEffect, useRef, useState } from "react";
import useStore from "@/app/store/store";
import "./about.css";

export default function AboutOverlay() {
  const { isAboutOpen, setIsAboutOpen, isBurguerMenuOpen } = useStore();
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const timerRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const close = () => setIsAboutOpen(false);

  // Foco al abrir; al cerrar vuelve al botón ABOUT (solo si se abrió antes:
  // en el montaje isAboutOpen=false y NO se toca el foco). preventScroll
  // para no saltar la página al cerrar con scroll avanzado.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isAboutOpen) {
      wasOpen.current = true;
      closeRef.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      wasOpen.current = false;
      const about = document.querySelector('[data-link="/me"]');
      if (about instanceof HTMLElement) about.focus({ preventScroll: true });
    }
  }, [isAboutOpen]);

  // ESC cierra + trampa de foco mínima (el panel declara aria-modal).
  useEffect(() => {
    if (!isAboutOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll("button:not([disabled]), a[href]")
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
  }, [isAboutOpen]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // El panel nace debajo de la nav (altura real, no supuesta): se recalcula
  // al abrir, al colapsar el burger y en resize.
  useEffect(() => {
    if (!isAboutOpen || !overlayRef.current) return;
    const syncTop = () => {
      const nav = document.querySelector(".Navbar");
      const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 76;
      overlayRef.current.style.setProperty("--nav-h", `${h + 12}px`);
    };
    syncTop();
    // El colapso del burger anima 1.5s: re-sincroniza al terminar (y por
    // timeout de respaldo) para no dejar hueco bajo la nav ya colapsada.
    const nav = document.querySelector(".Navbar");
    nav?.addEventListener("transitionend", syncTop);
    const fallback = window.setTimeout(syncTop, 1700);
    window.addEventListener("resize", syncTop);
    return () => {
      window.removeEventListener("resize", syncTop);
      nav?.removeEventListener("transitionend", syncTop);
      window.clearTimeout(fallback);
    };
  }, [isAboutOpen, isBurguerMenuOpen]);

  const copyEmail = async () => {
    // "Copiado" solo ante éxito real; si todo falla, el email queda visible
    // al lado para copiar a mano (no se miente al usuario).
    let ok = false;
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      ok = true;
    } catch {
      // Fallback sin Permissions API (HTTP viejo / clipboard bloqueado).
      const ta = document.createElement("textarea");
      ta.value = CONTACT_EMAIL;
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (!ok) return;
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Mismo scroll centrado que la nav (duplicado a propósito: link.js tiene
  // su comportamiento validado y no se toca).
  const goToSection = () => {
    close();
    const sec = document.querySelectorAll("section.section")[1];
    if (!sec) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = sec.getBoundingClientRect();
    const y = r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
    // 60ms: deja que el overlay empiece a cerrar (visibility) antes de medir.
    window.setTimeout(() => {
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    }, 60);
  };

  return (
    <div
      ref={overlayRef}
      className={`about-overlay ${isAboutOpen ? "open" : ""}`}
      aria-hidden={!isAboutOpen}
    >
      <div className="about-backdrop" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sobre mí"
        className="about-panel"
      >
        <button
          ref={closeRef}
          type="button"
          className="about-close"
          aria-label="Cerrar panel sobre mí"
          onClick={close}
          tabIndex={isAboutOpen ? 0 : -1}
        >
          <span aria-hidden="true">×</span> cerrar
        </button>
        <p className="about-label">Me llamo</p>
        <h2>Horangel Millan</h2>
        <p className="about-bio">
          Consultor SAP BTP en <a href="https://www.mundocloud.co" target="_blank" rel="noreferrer" tabIndex={isAboutOpen ? 0 : -1}>MundoCloud</a> con
          más de 4 años de trayectoria, de interfaces web a integraciones
          empresariales en la nube. Formado como Full-Stack, enfocado en
          software que conecta el negocio con la tecnología.
        </p>
        <p className="about-bio">
          Abierto a roles Full-Stack y consultoría.
        </p>
        <ul className="about-links">
          <li>
            <button type="button" onClick={copyEmail} tabIndex={isAboutOpen ? 0 : -1}>
              {copied ? "Copiado" : "Copiar email"}
            </button>
            <span className="about-mail" aria-hidden="true">{CONTACT_EMAIL}</span>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/horangelmillan"
              target="_blank"
              rel="noreferrer"
              tabIndex={isAboutOpen ? 0 : -1}
            >
              LinkedIn
            </a>
          </li>
          <li>
            <a
              href="https://github.com/horangelmillan"
              target="_blank"
              rel="noreferrer"
              tabIndex={isAboutOpen ? 0 : -1}
            >
              GitHub
            </a>
          </li>
        </ul>
        <button
          type="button"
          className="about-goto"
          onClick={goToSection}
          tabIndex={isAboutOpen ? 0 : -1}
        >
          Ver la sección sobre mí
        </button>
      </div>
    </div>
  );
}

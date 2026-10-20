"use client";

/*
 * Isla cliente del encabezado de Proyectos: muestra la etiqueta de tipo
 * (kind) y la descripción (stack) del proyecto enfocado en el carrusel.
 * La sección sigue siendo servidor: esta isla solo observa el
 * `data-active-slug` que el carrusel publica al cambiar el índice activo
 * (mismo patrón que ProjectBlob con MutationObserver). Sin loops ni
 * canvas nuevos. El `h1` ("Proyectos") permanece fijo en section.js.
 *
 * Transición (regla 0-atajos: UN SOLO objeto, sin duplicar ni superponer):
 * al cambiar el proyecto, el MISMO contenedor funde a 0 bajando 8px,
 * el texto se sustituye invisible y vuelve fundiendo al sitio (150/180ms).
 * Con `prefers-reduced-motion` el cambio es instantáneo, sin animar.
 */

import { useEffect, useRef, useState } from "react";
import { outfit, cinzel } from "@/app/fonts";
import { CAROUSEL_ITEMS } from "./carousel-config";

const OUT_MS = 150;
const IN_MS = 180;
const SHIFT_PX = 8;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function ProjectHeader({ items = CAROUSEL_ITEMS }) {
  const hostRef = useRef(null);
  const firstShown = useRef(true);
  // `slug` = objetivo publicado por el carrusel; `shown` = lo visible.
  // El texto solo se sustituye con el contenedor ya invisible.
  const [slug, setSlug] = useState(items[0] ? items[0].slug : "");
  const [shown, setShown] = useState(items[0] ? items[0].slug : "");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const section = host.closest("section");
    const carousel = section ? section.querySelector(".carousel") : null;
    if (!carousel) return;
    // Lectura inicial por si el carrusel ya resolvió otro activo al hidratar.
    if (carousel.dataset.activeSlug) setSlug(carousel.dataset.activeSlug);
    const mo = new MutationObserver(() => {
      if (carousel.dataset.activeSlug) setSlug(carousel.dataset.activeSlug);
    });
    mo.observe(carousel, { attributes: true, attributeFilter: ["data-active-slug"] });
    return () => mo.disconnect();
    // Montaje único: items es estático (config del carrusel).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salida: funde el contenedor (mismo objeto) y al terminar sustituye el
  // texto ya invisible. Si llega otro slug a mitad, se cancela y se
  // re-arranca hacia el último (nunca hay dos versiones visibles).
  useEffect(() => {
    if (slug === shown) return;
    const el = hostRef.current;
    if (!el || reducedMotion()) {
      setShown(slug);
      return;
    }
    let alive = true;
    el.getAnimations().forEach((a) => a.cancel());
    let out;
    try {
      out = el.animate(
        [
          { opacity: "1", transform: "translateY(0px)" },
          { opacity: "0", transform: `translateY(${SHIFT_PX}px)` },
        ],
        { duration: OUT_MS, easing: "ease-out", fill: "forwards" }
      );
    } catch {
      setShown(slug);
      return;
    }
    out.onfinish = () => {
      if (alive) setShown(slug);
    };
    return () => {
      alive = false;
      try {
        out.cancel();
      } catch {
        // Sin animación que cancelar.
      }
    };
  }, [slug, shown]);

  // Entrada: el contenedor (ya con el texto nuevo) vuelve a su sitio.
  // Sin fill: al terminar vuelve al estilo base, idéntico al final.
  useEffect(() => {
    if (firstShown.current) {
      firstShown.current = false;
      return;
    }
    const el = hostRef.current;
    if (!el || reducedMotion()) return;
    let inn;
    try {
      inn = el.animate(
        [
          { opacity: "0", transform: `translateY(${SHIFT_PX}px)` },
          { opacity: "1", transform: "translateY(0px)" },
        ],
        { duration: IN_MS, easing: "ease-out" }
      );
    } catch {
      return;
    }
    return () => {
      try {
        inn.cancel();
      } catch {
        // Sin animación que cancelar.
      }
    };
  }, [shown]);

  const active = items.find((it) => it.slug === shown) || items[0];
  if (!active) return null;
  return (
    <div ref={hostRef} data-active-slug={active.slug} aria-live="polite">
      <h2 className={cinzel.className}>{active.kind || active.context}</h2>
      <p className={outfit.className}>{active.stack || active.status}</p>
    </div>
  );
}

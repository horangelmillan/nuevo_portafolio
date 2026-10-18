"use client";
import { useEffect } from "react";
import useStore from "../store/store";

const useScrollData = () => {
    const { setIsFinalScroll, setScrollData, isFinalScroll, setActiveSection } = useStore();

    useEffect(() => {
        let ticking = false;
        let raf = 0;
        const handleScrollInner = () => {
            ticking = false;
            const scrollPosition = window.scrollY; // Posición actual del scroll
            const windowHeight = window.innerHeight; // Altura visible
            const documentHeight = document.documentElement.scrollHeight; // Altura total del documento

            setScrollData({
                y: window.scrollY,
                x: window.scrollX,
                windowHeight: window.innerHeight,
                windowWidth: window.innerWidth,
                scrollHeight: document.documentElement.scrollHeight
            });

            // Verifica si el usuario ha llegado al final
            if (documentHeight - scrollPosition <= windowHeight + 2) {
                setIsFinalScroll(true);
            } else {
                setIsFinalScroll(false);
            }

            // Sección activa por ID (no por índice): la sección cuyo centro
            // contiene el centro del viewport. Robusto ante reorden o
            // secciones de distinta altura (el round(scrollY/vh) asumía
            // 4 secciones exactas de 1vh).
            const mid = scrollPosition + windowHeight / 2;
            let activeId = "hero";
            let best = Infinity;
            for (const sec of document.querySelectorAll("section.section[id]")) {
              const r = sec.getBoundingClientRect();
              const top = r.top + scrollPosition;
              const d = Math.abs(top + r.height / 2 - mid);
              if (d < best) {
                best = d;
                activeId = sec.id;
              }
            }
            setActiveSection(activeId);
        };
        // rAF-throttle: como máximo una sincronización por frame, sin importar
        // cuántos eventos de scroll dispare el navegador.
        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                raf = requestAnimationFrame(handleScrollInner);
            }
        };

        handleScrollInner();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [setIsFinalScroll, setScrollData, setActiveSection]);
};

export default useScrollData;

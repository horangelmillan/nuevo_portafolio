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

            // Sección activa (0=hero..3=contacto): la nav resalta por scroll,
            // no por ruta (SPA de una sola página). El selector del
            // consumidor evita re-renders si el valor repite.
            const idx = Math.max(0, Math.min(3, Math.round(scrollPosition / windowHeight)));
            setActiveSection(idx);
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

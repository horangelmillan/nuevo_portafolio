"use client";
import { useEffect } from "react";
import useStore from "@/app/store/store";

// Resalta el link de la sección visible (índice en refs = índice de
// sección). Antes dependía de la ruta y quedaba fijo en HOME: SPA de una
// sola página donde la navegación es por scroll.
const useCrossOutLink = (refs) => {
    const activeSection = useStore(state => state.activeSection);

    useEffect(() => {
        refs.forEach((ref, i) => {
            if (!ref.current) return;

            if (i === activeSection) {
                ref.current.children[1].setAttribute("class", 'crossOut');
            } else {
                ref.current.children[1].setAttribute("class", 'crossIn');
            }
        });
    }, [activeSection, refs]); // Se ejecuta cuando cambia la sección visible
};

export default useCrossOutLink;

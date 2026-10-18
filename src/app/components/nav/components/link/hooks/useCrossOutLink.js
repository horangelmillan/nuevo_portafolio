"use client";
import { useEffect } from "react";
import useStore from "@/app/store/store";

// Resalta el link de la sección visible, por ID de sección (no por índice:
// el orden de refs y secciones puede divergir sin romper el highlight).
// SPA de una sola página donde la navegación es por scroll.
const useCrossOutLink = (pairs) => {
    const activeSection = useStore(state => state.activeSection);

    useEffect(() => {
        pairs.forEach(({ ref, id }) => {
            if (!ref.current) return;

            if (id === activeSection) {
                ref.current.children[1].setAttribute("class", 'crossOut');
            } else {
                ref.current.children[1].setAttribute("class", 'crossIn');
            }
        });
    }, [activeSection, pairs]); // Se ejecuta cuando cambia la sección visible
};

export default useCrossOutLink;

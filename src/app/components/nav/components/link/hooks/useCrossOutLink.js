"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const useCrossOutLink = (refs) => {
    const pathname = usePathname(); // Obtiene la ruta actual

    useEffect(() => {
        refs.forEach(ref => {
            if (!ref.current) return;

            if (pathname === ref.current.dataset.link) {
                ref.current.children[1].className = 'crossOut';
            } else {
                ref.current.children[1].className = 'crossIn';
            }
        });
    }, [pathname, refs]); // Se ejecuta cuando cambia la ruta

};

export default useCrossOutLink;

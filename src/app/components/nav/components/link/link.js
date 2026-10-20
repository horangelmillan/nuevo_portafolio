"use client";
import { useRef } from 'react';
import { outfit as outfitFont } from "../../../../fonts";
import useCrossOutLink from './hooks/useCrossOutLink';
import './link.css';
import useTogleBurguerMenu from './hooks/useTogleBurguerMenu';
import useStore from "@/app/store/store";

const Link = () => {

    const ref1 = useRef();
    const ref2 = useRef();
    const ref3 = useRef();
    const ref4 = useRef();
    const refLinks = useRef();

    useCrossOutLink([{ ref: ref1, id: 'hero' }, { ref: ref2, id: 'sobre-mi' }, { ref: ref3, id: 'proyectos' }, { ref: ref4, id: 'contacto' }]);
    useTogleBurguerMenu(refLinks);

    // ABOUT abre el overlay (A3) en vez de navegar: la sección sigue
    // accesible por scroll y desde el botón "Ver la sección" del panel.
    // El highlight por scroll no cambia (sigue por activeSection).
    const openAbout = () => {
        useStore.getState().setIsBurguerMenuOpen(false);
        useStore.getState().setIsAboutOpen(true);
    };
    // Scroll suave nativo centrado en la sección por ID: el punto medio de
    // la sección queda en el punto medio del viewport. Con reduced-motion
    // el salto es instantáneo (accesibilidad). Cierra el burger en móvil
    // para no tapar la sección destino.
    const scrollToSection = (id) => {
        const sec = document.getElementById(id);
        if (!sec) return;
        useStore.getState().setIsBurguerMenuOpen(false);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const r = sec.getBoundingClientRect();
        const y = r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    };

    return (
        <ul className={`${outfitFont.className} Links`} ref={refLinks}>
            <li><button ref={ref1} type="button" data-link="/" onClick={() => scrollToSection('hero')} ><span>INICIO</span><div></div></button></li>
            <li><button ref={ref2} type="button" data-link="/me" onClick={openAbout} aria-haspopup="dialog"><span>SOBRE MÍ</span><div></div></button></li>
            <li><button ref={ref3} type="button" data-link="/projects" onClick={() => scrollToSection('proyectos')} ><span>PROYECTOS</span><div></div></button></li>
            <li><button ref={ref4} type="button" data-link="/contact" onClick={() => scrollToSection('contacto')} ><span>CONTACTO</span><div></div></button></li>
        </ul>
    );
};

export default Link;
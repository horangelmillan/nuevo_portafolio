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

    useCrossOutLink([ref1, ref2, ref3, ref4]);
    useTogleBurguerMenu(refLinks);

    // Scroll suave nativo centrado en la sección i (0=hero..3=contacto):
    // el punto medio de la sección queda en el punto medio del viewport.
    // Con reduced-motion el salto es instantáneo (accesibilidad). Cierra el
    // burger en móvil para no tapar la sección destino.
    const scrollToSection = (i) => {
        const sec = document.querySelectorAll("section.section")[i];
        if (!sec) return;
        useStore.getState().setIsBurguerMenuOpen(false);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const r = sec.getBoundingClientRect();
        const y = r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    };

    return (
        <ul className={`${outfitFont.className} Links`} ref={refLinks}>
            <li><button ref={ref1} type="button" data-link="/" onClick={() => scrollToSection(0)} ><span>HOME</span><div></div></button></li>
            <li><button ref={ref2} type="button" data-link="/me" onClick={() => scrollToSection(1)} ><span>ABOUT</span><div></div></button></li>
            <li><button ref={ref3} type="button" data-link="/projects" onClick={() => scrollToSection(2)} ><span>WORK</span><div></div></button></li>
            <li><button ref={ref4} type="button" data-link="/contact" onClick={() => scrollToSection(3)} ><span>CONTACT</span><div></div></button></li>
        </ul>
    );
};

export default Link;
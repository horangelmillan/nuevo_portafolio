"use client";
import { useRef } from 'react';
import { outfit as outfitFont } from "../../../../fonts";
import useCrossOutLink from './hooks/useCrossOutLink';
import './link.css';
import useTogleBurguerMenu from './hooks/useTogleBurguerMenu';

const Link = () => {

    const ref1 = useRef();
    const ref2 = useRef();
    const ref3 = useRef();
    const ref4 = useRef();
    const refLinks = useRef();

    useCrossOutLink([ref1, ref2, ref3, ref4]);
    useTogleBurguerMenu(refLinks);

    return (
        <ul className={`${outfitFont.className} Links`} ref={refLinks}>
            <li><button ref={ref1} type="button" data-link="/" ><span>HOME</span><div></div></button></li>
            <li><button ref={ref2} type="button" data-link="/me" ><span>ABOUT</span><div></div></button></li>
            <li><button ref={ref3} type="button" data-link="/projects" ><span>WORK</span><div></div></button></li>
            <li><button ref={ref4} type="button" data-link="/contact" ><span>CONTACT</span><div></div></button></li>
        </ul>
    );
};

export default Link;
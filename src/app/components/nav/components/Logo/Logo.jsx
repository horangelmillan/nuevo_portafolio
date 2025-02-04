"use client";
import React, { useRef } from "react";
import useTogleLogo from "./hooks/useTogleLogo";
import useStore from "@/app/store/store";
import './Logo.css';

const Logo = ({ size }) => {

    const { isBurguerMenuOpen, setIsBurguerMenuOpen } = useStore();

    const refGroup1 = useRef();
    const refGroup2 = useRef();

    useTogleLogo([refGroup1, refGroup2])

    const onClickController = () => {
        setIsBurguerMenuOpen(!isBurguerMenuOpen);
    }

    return (
        <svg
            onClick={onClickController}
            width={size}
            height={size}
            viewBox="0 0 140 140"
            version="1.1"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient gradientUnits="userSpaceOnUse" x1="-1.6841931E-06" y1="100.00015" x2="100" y2="100" id="Grad1">
                    <stop offset="9.876543%" stopColor="#000000" />
                    <stop offset="100%" stopColor="#FF0101" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" x1="75.867165" y1="-13" x2="0" y2="67.60124" id="Grad2">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="48.146294%" stopColor="#EF0000" />
                    <stop offset="100%" stopColor="#FF6200" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" x1="-1.6850748E-06" y1="100.00015" x2="100" y2="100" id="Grad3">
                    <stop offset="9.876543%" stopColor="#000000" />
                    <stop offset="100%" stopColor="#FF0101" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" x1="35.832115" y1="-18.499868" x2="-3.1094025E-10" y2="67.60124" id="Grad4">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="48.146294%" stopColor="#EF0000" />
                    <stop offset="100%" stopColor="#FF6200" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" x1="15.428572" y1="80.63249" x2="108" y2="-2.2461614E-05" id="Grad5">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="48.863636%" stopColor="#FF0000" />
                    <stop offset="100%" stopColor="#FF5900" />
                </linearGradient>
                <rect width="140" height="140" id="artboard_1" />
                <clipPath id="clip_1">
                    <use xlinkHref="#artboard_1" clipRule="evenodd" />
                </clipPath>
            </defs>
            <g id="Mesa-de-trabajo" clipPath="url(#clip_1)">
                <g className="group1" ref={refGroup1}>
                    <g id="Grupo" transform="translate(200.0517578E-05 0)" artboard="92418ea7-135e-4344-93c8-6ab27576bf37">
                        <path d="M9.15527e-05 0L100 0.110374L0.110284 100L9.15527e-05 0Z" id="Triángulo" fill="url(#Grad1)" fillRule="evenodd" stroke="none" />
                        <path d="M0 6.10352e-05L0.139035 100L20 80L20 20L81 20L101 0.126229L0 6.10352e-05Z" id="Vector-3" fill="url(#Grad2)" fillRule="evenodd" stroke="none" />
                    </g>
                </g>
                <g className="group2" ref={refGroup2}>
                    <g id="Grupo-2" transform="matrix(-1.0000006 -2.582223E-06 2.582223E-06 -1.0000006 139.99976 140)" artboard="7773eac5-a69e-4f2f-ac32-8f0f2b89ee07">
                        <path d="M9.15527e-05 1.55707e-15L100 0.110374L0.110284 100L9.15527e-05 1.55707e-15Z" id="Triángulo" fill="url(#Grad3)" fillRule="evenodd" stroke="none" />
                        <path d="M-8.33e-17 6.10352e-05L0.139035 100L21.0822 79.0626L21.0821 19.2499L82.103 19.0985L101 0.126229L-8.33e-17 6.10352e-05Z" id="Vector-3" fill="url(#Grad4)" fillRule="evenodd" stroke="none" />
                    </g>
                </g>
                <path d="M14.9998 115L104.256 25.9999L123 25.9999L61.1301 88.3875L34.7383 115L14.9998 115Z" id="Rectángulo" fill="url(#Grad5)" fillRule="evenodd" stroke="none" artboard="fc7edbcd-822a-4e39-9408-3efd0b368753" />
            </g>
        </svg>
    );
};

export default Logo;

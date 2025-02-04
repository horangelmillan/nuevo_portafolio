"use client";
import { useEffect } from "react";
import useStore from "@/app/store/store";

const useTogleLogo = (refs) => {
    const isBurguerMenuOpen = useStore(state => state.isBurguerMenuOpen);

    // Función para obtener el valor de la variable CSS
    const isSmallScreen = () => {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--is-small-screen')
            .trim() === 'true';
    };

    useEffect(() => {
        const smallScreen = isSmallScreen(); // Leer el valor de la variable CSS

        if (isBurguerMenuOpen && smallScreen) {
            refs[0].current.clasName = 'group1Start';
            refs[1].current.clasName = 'group2Start';
        } else {
            refs[0].current.clasName = 'group1End';
            refs[1].current.clasName = 'group2End';
        }
    }, [isBurguerMenuOpen]);

};

export default useTogleLogo;
"use client";
import { useEffect } from "react";
import useStore from "../store/store";

const useScrollData = () => {
    const { setIsFinalScroll, setScrollData, isFinalScroll } = useStore();

    useEffect(() => {
        const handleScroll = () => {
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
            if (documentHeight - scrollPosition === windowHeight) {
                setIsFinalScroll(true);
            } else {
                setIsFinalScroll(false);
            }
        };

        document.addEventListener("scroll", handleScroll);

        return () => {
            document.removeEventListener("scroll", handleScroll);
        };
    }, []);
};

export default useScrollData;

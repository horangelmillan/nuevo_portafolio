"use client";
import { useEffect, useState } from "react";
import { throttle } from "lodash";
import useStore from "../../../store/store";

const useScrollNavbar = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const { storeScrollData, setIsShowNavbar } = useStore();

    useEffect(() => {
        // Función que se ejecutará durante el scroll (limitada por throttle)
        const switchShowNavbar = throttle(() => {
            if (storeScrollData.y <= scrollPosition) {
                setIsShowNavbar(true);
            } else {
                setIsShowNavbar(false);
            };

            setScrollPosition(storeScrollData.y);
        }, 500); // Limitar la frecuencia de ejecución a una vez cada 200ms

        window.addEventListener('scroll', switchShowNavbar);

        return () => {
            window.removeEventListener('scroll', switchShowNavbar);
        };
    });
};

export default useScrollNavbar;

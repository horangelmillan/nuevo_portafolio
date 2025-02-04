"use client";
import { useEffect } from "react";
import { throttle } from "lodash";
import useStore from "../../../store/store";

const useScrollFooter = () => {
    const { setIsShowFooter, isFinalScroll, storeScrollData } = useStore();

    useEffect(() => {
        // Función que se ejecutará durante el scroll (limitada por throttle)
        const switchShowFooter = throttle(() => {
            if (storeScrollData.windowHeight + storeScrollData.y  === storeScrollData.scrollHeight) {
                setIsShowFooter(true);
            } else {
                setIsShowFooter(false);
            };
        }, 500); // Limitar la frecuencia de ejecución a una vez cada 200ms

        window.addEventListener('scroll', switchShowFooter);

        return () => {
            window.removeEventListener('scroll', switchShowFooter);
        };
    }, [storeScrollData]);
};

export default useScrollFooter;

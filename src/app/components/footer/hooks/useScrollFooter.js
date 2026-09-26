"use client";
import { useEffect } from "react";
import { throttle } from "lodash";
import useStore from "../../../store/store";

const useScrollFooter = () => {
    const { setIsShowFooter, isFinalScroll, storeScrollData } = useStore();

    useEffect(() => {
        // Función que se ejecutará durante el scroll (limitada por throttle)
        const switchShowFooter = throttle(() => {
            if (storeScrollData.windowHeight + storeScrollData.y >= storeScrollData.scrollHeight - 2) {
                setIsShowFooter(true);
            } else {
                setIsShowFooter(false);
            };
        }, 500);

        window.addEventListener('scroll', switchShowFooter, { passive: true });

        return () => {
            switchShowFooter.cancel();
            window.removeEventListener('scroll', switchShowFooter);
        };
    }, [storeScrollData, setIsShowFooter]);
};

export default useScrollFooter;

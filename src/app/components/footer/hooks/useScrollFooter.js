"use client";
import { useEffect } from "react";
import { throttle } from "lodash";
import useStore from "../../../store/store";

const useScrollFooter = () => {
    // Solo el setter: este hook no necesita re-renderizarse con el scroll.
    // Los datos se leen vía getState() dentro del handler throttled, así el
    // efecto se monta una sola vez (antes se re-suscribía en cada tick).
    const setIsShowFooter = useStore((s) => s.setIsShowFooter);

    useEffect(() => {
        // Función que se ejecutará durante el scroll (limitada por throttle)
        const switchShowFooter = throttle(() => {
            const { storeScrollData } = useStore.getState();
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
    }, [setIsShowFooter]);
};

export default useScrollFooter;

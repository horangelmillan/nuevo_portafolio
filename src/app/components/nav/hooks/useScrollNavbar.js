"use client";
import { useEffect, useRef } from "react";
import { throttle } from "lodash";
import useStore from "../../../store/store";

const useScrollNavbar = () => {
    const setIsShowNavbar = useStore((s) => s.setIsShowNavbar);
    const lastY = useRef(0);

    useEffect(() => {
        const switchShowNavbar = throttle(() => {
            const y = window.scrollY;
            setIsShowNavbar(y <= lastY.current);
            lastY.current = y;
        }, 150);

        lastY.current = window.scrollY;
        window.addEventListener("scroll", switchShowNavbar, { passive: true });

        return () => {
            switchShowNavbar.cancel();
            window.removeEventListener("scroll", switchShowNavbar);
        };
    }, [setIsShowNavbar]);
};

export default useScrollNavbar;

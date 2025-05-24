import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useStore from "@/app/store/store";

const useTogleBurguerMenu = (refs) => {
    const pathname = usePathname(); // Obtiene la ruta actual
    const isBurguerMenuOpen = useStore(state => state.isBurguerMenuOpen);

    useEffect(() => {
            if (isBurguerMenuOpen) {
                refs.current.setAttribute('class', 'Links show');
            } else {
                refs.current.setAttribute('class', 'Links hide');
            }
    }, [pathname, isBurguerMenuOpen]);

};

export default useTogleBurguerMenu;
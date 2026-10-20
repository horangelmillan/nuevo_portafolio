import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useStore from "@/app/store/store";

const useTogleBurguerMenu = (refs) => {
    const pathname = usePathname(); // Obtiene la ruta actual
    const isBurguerMenuOpen = useStore(state => state.isBurguerMenuOpen);

    useEffect(() => {
        // classList (no setAttribute): conserva las clases existentes
        // (incluida la de la fuente Outfit de next/font) y solo alterna
        // show/hide. setAttribute las borraba y la nav caía a serif.
        if (!refs.current) return;
        refs.current.classList.remove('show', 'hide');
        refs.current.classList.add(isBurguerMenuOpen ? 'show' : 'hide');
    }, [pathname, isBurguerMenuOpen, refs]);

};

export default useTogleBurguerMenu;
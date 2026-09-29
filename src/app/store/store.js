import { create } from "zustand";

// Definimos el store usando Zustand
const useStore = create((set) => ({
    isRetract: false,
    setIsRetract: (value) => set({ isRetract: value }),
    storeScrollData: {},
    setScrollData: (value) => set({ storeScrollData: value }),
    isBurguerMenuOpen: false,
    setIsBurguerMenuOpen: (value) => set({ isBurguerMenuOpen: value }),
    isShowNavbar: true,
    setIsShowNavbar: (value) => set({ isShowNavbar: value }),
    isShowFooter: false,
    setIsShowFooter: (value) => set({ isShowFooter: value }),
    activeSection: 0,
    setActiveSection: (value) => set({ activeSection: value }),
    isFinalScroll: false,
    setIsFinalScroll: (value) => set({ isFinalScroll: value})
}));

export default useStore;
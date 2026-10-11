"use client";
import Link from "./components/link/link";
import Logo from "./components/Logo/Logo";
import useStore from "@/app/store/store";
import useScrollNavbar from "./hooks/useScrollNavbar";
import "./nav.css";

export default function Nav() {
    useScrollNavbar();
    const { isShowNavbar } = useStore();
    // Blanco sobre el hero (fondo oscuro), negro en el resto (vía CSS en
    // link.css). En .Navbar (no en Links) porque el hook del burger
    // reescribe la clase del ul y la borraría.
    const activeSection = useStore((s) => s.activeSection);

    return (
        <div className={`Navbar ${isShowNavbar ? 'fadeIn' : 'fadeOut'}${activeSection === 0 ? ' on-hero' : ''}`}>
            <div className="Navbar-content">
                <Logo size={"55px"} />
                <Link /> 
            </div>
            <div className="border-bottom"></div>
        </div>
    );
}

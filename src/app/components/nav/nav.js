"use client";
import Link from "./components/link/link";
import Logo from "./components/Logo/Logo";
import useStore from "@/app/store/store";
import useScrollNavbar from "./hooks/useScrollNavbar";
import "./nav.css";

export default function Nav() {
    useScrollNavbar();
    const { isShowNavbar } = useStore();

    return (
        <div className={`Navbar ${isShowNavbar ? 'fadeIn' : 'fadeOut'}`}>
            <div className="Navbar-content">
                <Logo size={"55px"} />
                <Link /> 
            </div>
            <div className="border-bottom"></div>
        </div>
    );
}

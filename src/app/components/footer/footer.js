"use client";
import useStore from "@/app/store/store";
import Image from "next/image";
import useScrollFooter from "./hooks/useScrollFooter";
import "./footer.css";

export default function Footer() {
    useScrollFooter()
    const { isShowFooter } = useStore();

    return(
        <div className={`Footer ${isShowFooter ? 'fadeInFooter' : 'fadeOutFooter'}`}>
            <div className="FooterContent">
                <Image src="/brand/horangel-logo.svg" width={34} height={34} alt="" aria-hidden="true" />
                <p>© 2026 Horangel Millan Ramos — Gracias por llegar hasta aquí.</p>
            </div>
        </div>
    )
}

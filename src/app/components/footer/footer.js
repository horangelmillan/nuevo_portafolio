"use client";
import useStore from "@/app/store/store";
import useScrollFooter from "./hooks/useScrollFooter";
import "./footer.css";

export default function Footer() {
    useScrollFooter()
    const { isShowFooter } = useStore();

    return(
        <div className={`Footer ${isShowFooter ? 'fadeInFooter' : 'fadeOutFooter'}`}>
            <p>© 2026 Horangel Millan Ramos — Gracias por llegar hasta aquí.</p>
        </div>
    )
}

"use client"; // Necesario para usar hooks en Next.js

import { useEffect, useRef } from "react";
import Section from "./components/section/section";
import "./body.css";

export default function Body() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const sections = container.querySelectorAll("section");

    let isScrolling = false;

    const handleScroll = (event) => {
      if (isScrolling) return; // Evita desplazamientos dobles
      isScrolling = true;

      event.preventDefault();
      const currentIndex = [...sections].findIndex(
        (section) => section.getBoundingClientRect().top >= 0
      );

      const nextIndex = event.deltaY > 0 ? currentIndex + 1 : currentIndex - 1;

      if (sections[nextIndex]) {
        sections[nextIndex].scrollIntoView({ behavior: "smooth" });
      }

      setTimeout(() => {
        isScrolling = false;
      }, 500); // Evita scrolls seguidos
    };

    container.addEventListener("wheel", handleScroll);

    return () => container.removeEventListener("wheel", handleScroll);
  }, []);

  return (
    <div className="body" ref={containerRef}>
      <Section />
      <Section />
      <Section />
      <Section />
    </div>
  );
}

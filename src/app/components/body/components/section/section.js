import "./section.css";
import localFont from "next/font/local";
import { outfit } from "../../../../fonts";
import ProjectCarousel from "./components/project-carousel/ProjectCarousel";
import RevealText from "./components/reveal-text/RevealText";
import ProjectBlob from "./components/project-carousel/ProjectBlob";

const cinzel = localFont({
  src: "../../../../fonts/Cinzel-VariableFont_wght.ttf",
});

export default function Section({ sectionType = "plain", title, subtitle, content, carouselItems = null, reveal = false, revealAccents = [], revealLinks = {} }) {
  if (!title && !subtitle && !content) return null;
  const isHero = sectionType === "hero";
  const [revealMain, ...revealRest] = reveal ? String(content).split("\n") : [null, []];
  return (
    <section className={isHero ? "section hero" : "section"}>
      {/* Fondo vivo global fijo a nivel page.js (fase hero = v7). */}
      {/* Blob de proyectos a tamaño de sección (solo con carrusel). */}
      {carouselItems && <ProjectBlob items={carouselItems} />}
      {/* Contenido placeholder - REEMPLAZAR con tu información real */}
      <div className={"section-content"}>
        <h1 className={outfit.className}>{title}</h1>
        <h2 className={cinzel.className}>{subtitle}</h2>
        {reveal ? (
          <>
            <RevealText text={revealMain} accents={revealAccents} links={revealLinks} className={outfit.className} />
            {revealRest.map((t, i) => (
              <p key={i} className={`reveal-closing ${outfit.className}`}>
                {t}
              </p>
            ))}
          </>
        ) : (
          <p className={outfit.className}>
            {content}
          </p>
        )}
        {carouselItems && <ProjectCarousel items={carouselItems} />}
      </div>
    </section>
  );
}
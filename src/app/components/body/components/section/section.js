import "./section.css";
import { outfit, cinzel } from "../../../../fonts";
import ProjectCarousel from "./components/project-carousel/ProjectCarousel";
import RevealText from "./components/reveal-text/RevealText";
import ProjectBlob from "./components/project-carousel/ProjectBlob";
import ContactBlock from "./components/contact/ContactBlock";
import ContactCubes from "./components/contact/ContactCubes";
import CaseOverlay from "../../../case/CaseOverlay";

export default function Section({ id = null, sectionType = "plain", title, subtitle, content, carouselItems = null, reveal = false, revealAccents = [], revealLinks = {} }) {
  if (!title && !subtitle && !content) return null;
  const isHero = sectionType === "hero";
  const [revealMain, ...revealRest] = reveal ? String(content).split("\n") : [null, []];
  return (
    <section id={id} className={isHero ? "section hero" : "section"}>
      {/* Fondo vivo global fijo a nivel page.js (fase hero = v7). */}
      {/* Cortina: detalle abajo → blob en medio → carrusel arriba. Solo
          Proyectos (con carrusel) monta el detalle; el resto ni se entera. */}
      {carouselItems && <CaseOverlay />}
      {/* Blob de proyectos a tamaño de sección (solo con carrusel). */}
      {carouselItems && <ProjectBlob items={carouselItems} />}
      {/* Cubos de contacto: canvas propio a la derecha (no toca la card). */}
      {id === "contacto" && <ContactCubes />}
      {/* Contenido placeholder - REEMPLAZAR con tu información real */}
      <div className={"section-content"}>
        <h1 className={outfit.className}>{title}</h1>
        {subtitle ? <h2 className={cinzel.className}>{subtitle}</h2> : null}
        {reveal ? (
          <>
            <RevealText text={revealMain} accents={revealAccents} links={revealLinks} className={outfit.className} />
            {revealRest.map((t, i) => (
              <p key={i} className={`reveal-closing ${outfit.className}`}>
                {t}
              </p>
            ))}
          </>
        ) : id === "contacto" ? (
          <ContactBlock />
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
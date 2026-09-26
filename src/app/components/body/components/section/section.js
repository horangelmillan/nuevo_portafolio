import "./section.css";
import localFont from "next/font/local";

const cinzel = localFont({
  src: "../../../../fonts/Cinzel-VariableFont_wght.ttf",
});

const outfit = localFont({
  src: "../../../../fonts/Outfit-VariableFont_wght.ttf",
});

export default function Section({ sectionType = "plain", title, subtitle, content }) {
  if (!title && !subtitle && !content) return null;
  const isHero = sectionType === "hero";
  return (
    <section className={isHero ? "section hero" : "section"}>
      {/* Fondo vivo global fijo a nivel page.js (fase hero = v7). */}
      {/* Contenido placeholder - REEMPLAZAR con tu información real */}
      <div className={"section-content"}>
        <h1 className={outfit.className}>{title}</h1>
        <h2 className={cinzel.className}>{subtitle}</h2>
        <p>
          {content}
        </p>
      </div>
    </section>
  );
}
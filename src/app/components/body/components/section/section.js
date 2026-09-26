import "./section.css";
import localFont from "next/font/local";

const cinzel = localFont({
  src: "../../../../fonts/Cinzel-VariableFont_wght.ttf",
});

const outfit = localFont({
  src: "../../../../fonts/Outfit-VariableFont_wght.ttf",
});

export default function Section({ sectionType = "hero", title, subtitle, content }) {
  if (!title && !subtitle && !content) return null;
  return (
    <section className="section">
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
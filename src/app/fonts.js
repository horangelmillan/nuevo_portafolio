import localFont from "next/font/local";

// Única definición de Outfit (antes duplicada: local en section.js +
// Google en link.js). Variable completa: cubre los pesos 400/700 que
// pedía la vía Google. Cinzel también en vía única (antes solo en
// section.js; ahora la comparten sección y tarjetas de proyecto).
export const outfit = localFont({
  src: "./fonts/Outfit-VariableFont_wght.ttf",
});

export const cinzel = localFont({
  src: "./fonts/Cinzel-VariableFont_wght.ttf",
});

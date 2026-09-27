import localFont from "next/font/local";

// Única definición de Outfit (antes duplicada: local en section.js +
// Google en link.js). Variable completa: cubre los pesos 400/700 que
// pedía la vía Google. Cinzel no se duplica: vive solo en section.js.
export const outfit = localFont({
  src: "./fonts/Outfit-VariableFont_wght.ttf",
});

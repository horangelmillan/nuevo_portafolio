/*
 * Spec del carrusel de proyectos (Opción A: referencia + original).
 * Parámetros extraídos como REFERENCIA del bundle público de
 * cedricpereira.com (/js/1.1.js, 227KB) el 2026-10-11. El código de este
 * repo es implementación original; de la referencia solo se toman números
 * y arquitectura, nunca código verbatim (obra con copyright, sin licencia).
 *
 * Tabla de referencia (medido, no copiado):
 * - Easing dominante: Power4.easeInOut (13 usos) > Power3.easeInOut (7) >
 *   Power4.easeOut (5). Duraciones: hover .6s, tintes .8s, shows 1s.
 * - Escala por proximidad al centro (medido en vivo): 0.915 (lejos) → 1.43
 *   (centro). AQUÍ ADAPTADO a tarjetas (no a títulos SVG gigantes):
 *   0.94 → 1.12. Misma curva, distinta amplitud (decisión propia).
 * - Física: matter-js con gravedad 0 (flotan). El carrusel en sí es drag
 *   libre con inercia + clamp, sin snap. Flechas laterales (zonas 145px).
 * - Cursor: pointer estándar (verificado: sin custom cursor).
 * - Fricción del bundle = defaults de matter (.1/.5/.01), NO sus valores
 *   afinados: la fricción de inercia de aquí es tuning propio (FRICTION).
 */

export const CAROUSEL_ITEMS = [
  {
    title: "Portfolio",
    context: "Next.js 15 · React 19 · Canvas propio",
    status: "Este sitio — fondo generativo + carrusel",
    // Encabezado de sección: etiqueta de tipo + descripción del proyecto
    // enfocado. Solo contenido veraz presente en el repo.
    kind: "Sitio web",
    stack: "Next.js 15 · React 19 · Canvas propio",
    color: "#cf4409",
    slug: "portfolio",
  },
  {
    title: "SAP BTP",
    context: "Integraciones cloud empresariales",
    status: "Consultoría — casos por publicar",
    // Vacío honesto: el repo no lista tecnologías SAP concretas
    // (actividad descrita en body.js, no stack afirmado).
    kind: "Consultoría cloud",
    stack: "Interfaces, servicios e integraciones",
    color: "#a4133c",
    slug: "sap-btp",
  },
  {
    title: "Apps JS",
    context: "Empresarial · frontend moderno",
    status: "Mantenibles, con E2E",
    // Vacío parcial: sin framework concreto confirmado en el repo
    // (nivel actividad: ecosistema + frontend moderno).
    kind: "Aplicación empresarial",
    stack: "Ecosistema JavaScript · frontend moderno",
    color: "#e63946",
    slug: "apps-js",
  },
  {
    title: "Próximo caso",
    context: "Demo + repo + métricas",
    status: "En preparación",
    kind: "En preparación",
    stack: "Demo + repo + métricas",
    color: "#b03a0e",
    slug: "proximo",
  },
  {
    title: "MundoCloud",
    context: "Sitio corporativo · WordPress",
    status: "En línea desde 2026",
    // Contenido real en cases.js (bloques Diseño/Operación).
    kind: "Sitio corporativo",
    stack: "WordPress a medida · HTML · formularios",
    color: "#3b4fe4",
    slug: "mundocloud",
  },
];

export const PHYS = {
  // Inercia: decaimiento de velocidad por frame @60fps (tuning propio).
  friction: 0.94,
  // Por debajo de esta velocidad (px/frame) la inercia se detiene.
  stopVel: 0.05,
  // Flechas: tween al centro (ref: shows ~1s, hovers .6s → 800ms intermedio).
  arrowMs: 800,
  // Rueda horizontal: 1px de pista por 1px de delta (trackpads).
  wheelGain: 1,
  // Snap al centro al soltar (decisión del usuario 2026-10-11; la
  // referencia es scroll libre sin snap). Si el flick supera flickVel, la
  // tarjeta destino avanza una en la dirección del gesto.
  snapMs: 450,
  flickVel: 2,
  // Rubber-band en los bordes (feedback 2026-10-11: el tope duro se sentía
  // "duro" y "bloqueaba"): pasado el límite el drag cede al 35% hasta un
  // máximo de overshoot px; al soltar, el snap vuelve al centro válido.
  rubber: 0.35,
  overshoot: 120,
  // Escala/opacidad por proximidad (amplitud adaptada, ver cabecera).
  minScale: 0.94,
  maxScale: 1.12,
  minOpacity: 0.5,
};

/*
 * Identidad orgánica por proyecto (A2): cada tarjeta tiene su propia forma
 * objetivo (amplitudes/fases de los armónicos). Al cambiar la activa, la
 * forma morfea hacia la destino y el color transiciona a su acento (~0.8s,
 * como los tintes de referencia). Formas originales, no los paths del autor.
 * Clave por slug (no por índice): el orden de CAROUSEL_ITEMS puede cambiar
 * sin romper la identidad de cada proyecto.
 */
export const BLOB_SHAPES = {
  portfolio: { amp1: 0.1, amp2: 0.05, sx: 1.0, sy: 1.0 }, // redonda base
  "sap-btp": { amp1: 0.06, amp2: 0.11, sx: 0.94, sy: 1.1 }, // pera vertical
  "apps-js": { amp1: 0.13, amp2: 0.03, sx: 1.12, sy: 0.92 }, // apaisada
  proximo: { amp1: 0.09, amp2: 0.08, sx: 1.02, sy: 1.04 }, // casi redonda viva
  mundocloud: { amp1: 0.11, amp2: 0.09, sx: 0.96, sy: 1.06 }, // alta con hombros
};

// Forma del slug (fallback: la base, nunca undefined).
export function blobShapeFor(slug) {
  return { ...(BLOB_SHAPES[slug] || BLOB_SHAPES.portfolio) };
}

export const BLOB = {
  // Asentamiento exponencial ≈ tintes .8s de referencia (tuning propio).
  settleRate: 3.5,
  // Radio = lo que quepa (ancho ×0.30 y espacio libre sobre/bajo el ancla
  // menos la sombra), acotado [minR, maxR]: nunca recorta en ningún viewport.
  widthFrac: 0.3,
  minR: 80,
  maxR: 340,
  shadowBlur: 70,
  // Respiración (escala global lenta, SIN rotación) + deriva del centro.
  breathAmp: 0.025,
  breathPeriod: 7,
  driftPx: 18,
  driftPeriod: 9,
  // Presencia sin molestar: alfa del relleno (las tarjetas son casi opacas).
  fillAlpha: 0.9,
  dprCap: 2,
  // Gelatina por puntero (arquitectura de la evidencia, números adaptados a
  // nuestro motor paramétrico — ver blob-physics.js): el cursor empuja como
  // un cuerpo blando (restitution 0: solo empuja, sin rebote) y la red
  // elástica recupera (anchor suave + vecinos + centro).
  jellySamples: 24,
  jellyFreq: 1.4,
  jellyDamp: 2.5,
  jellyNeighbor: 60,
  jellyGain: 0.02,
  jellyDent: 14,
  jellyPosK: 30,
};

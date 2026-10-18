/*
 * Casos de proyecto: contenido del overlay (sin rutas; decisión usuario).
 * Solo MundoCloud tiene contenido real; el resto usa placeholder honesto
 * hasta que el usuario escriba sus casos.
 */

export const CASES = {
  mundocloud: {
    title: "MundoCloud",
    context: "Sitio web corporativo",
    date: "2026",
    role: "Diseño, desarrollo y operación",
    color: "#3b4fe4",
    siteUrl: "https://www.mundocloud.co",
    blocks: [
      {
        heading: "Diseño y contenido",
        body: "Sitio corporativo en WordPress a medida: HTML con intención visual y funcional, formularios de contacto y gestión de plugins para que el equipo publique sin depender de un desarrollador.",
      },
      {
        heading: "Operación",
        body: "Dominios, certificados SSL, cPanel y despliegues en GoDaddy, con caché para tiempos de carga sanos y monitoreo básico de disponibilidad.",
      },
      {
        heading: "Confianza legal",
        body: "Avisos de cookies y políticas de tratamiento de datos integradas en el flujo del sitio, no como parche de última hora.",
      },
    ],
  },
  portfolio: {
    title: "Portfolio",
    context: "Next.js 15 · React 19 · Canvas propio",
    date: "2026",
    role: "Diseño y desarrollo",
    color: "#cf4409",
    image: null,
    siteUrl: null,
    blocks: [
      {
        heading: "En preparación",
        body: "Caso en preparación: aquí irán la demo, el repositorio y las métricas de este proyecto.",
      },
    ],
  },
  "sap-btp": {
    title: "SAP BTP",
    context: "Integraciones cloud empresariales",
    date: "2026",
    role: "Consultoría",
    color: "#a4133c",
    image: null,
    siteUrl: null,
    blocks: [
      {
        heading: "En preparación",
        body: "Caso en preparación: aquí irán la demo, el repositorio y las métricas de este proyecto.",
      },
    ],
  },
  "apps-js": {
    title: "Apps JS",
    context: "Empresarial · frontend moderno",
    date: "2026",
    role: "Desarrollo",
    color: "#e63946",
    image: null,
    siteUrl: null,
    blocks: [
      {
        heading: "En preparación",
        body: "Caso en preparación: aquí irán la demo, el repositorio y las métricas de este proyecto.",
      },
    ],
  },
  proximo: {
    title: "Próximo caso",
    context: "Demo + repo + métricas",
    date: "2026",
    role: "Por definir",
    color: "#b03a0e",
    image: null,
    siteUrl: null,
    blocks: [
      {
        heading: "En preparación",
        body: "Caso en preparación: aquí irán la demo, el repositorio y las métricas de este proyecto.",
      },
    ],
  },
};

export const CASE_SLUGS = Object.keys(CASES);

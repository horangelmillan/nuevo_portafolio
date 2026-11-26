/*
 * Casos de proyecto: contenido del overlay (sin rutas; decisión usuario).
 * Solo MundoCloud tiene contenido real; el resto usa placeholder honesto
 * hasta que el usuario escriba sus casos.
 */

export const CASES = {
  mundocloud: {
    title: "MundoCloud",
    context: "Sitio corporativo · WordPress",
    date: "2022 — Actualidad",
    role: "Administración web · Infraestructura",
    color: "#3b4fe4",
    siteUrl: "https://www.mundocloud.co",
    media: [
      {
        src: "/cases/mundocloud-hero.jpg",
        alt: "Portada del sitio corporativo MundoCloud",
        caption: "Home — propuesta de valor y acceso a consultoría",
      },
      {
        src: "/cases/mundocloud-interior.jpg",
        alt: "Sección interior de soluciones MundoCloud",
        caption: "Interior — arquitectura de contenidos por servicio",
      },
    ],
    blocks: [
      {
        heading: "Plataforma WordPress",
        body: "Administración integral sobre WordPress con tema Astra y constructor Elementor: estructura de páginas (Inicio, Nosotros, Soluciones, Servicios, Contactos), gestión de roles y actualizaciones de núcleo, temas y plugins con mínima fricción operativa.",
        visual: "wordpress",
      },
      {
        heading: "Dominios, hosting y despliegues",
        body: "Gestión del dominio mundocloud.co (DNS, redirecciones y registros), hosting con panel cPanel, cuentas, backups y despliegues ordenados del sitio corporativo.",
        visual: "dns",
      },
      {
        heading: "SSL y cumplimiento legal",
        body: "Certificado SSL activo con redirección total a HTTPS. Integración de aviso de cookies y política de tratamiento de datos (Complianz) conforme al flujo del sitio.",
        visual: "ssl",
      },
      {
        heading: "Caché y rendimiento",
        body: "Caché de página con WP Super Cache y caché de objetos con Docket Cache para tiempos de carga estables y menor carga en servidor en páginas corporativas.",
        visual: "cache",
      },
      {
        heading: "Optimización de medios",
        body: "Conversión a WebP, miniaturas adaptativas de Elementor y carga diferida de imágenes para una home corporativa ligera sin perder calidad visual.",
        visual: "media",
      },
      {
        heading: "Formularios y correo",
        body: "Formularios de contacto con WPForms y entregabilidad supervisada con SureMails: registro de envíos y continuidad en la captación de consultorías.",
        visual: "forms",
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

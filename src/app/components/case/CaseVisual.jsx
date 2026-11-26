"use client";

/*
 * Ilustraciones por bloque del caso (SVG inline + CSS, sin canvas nuevo,
 * sin dependencias, sin loops JS). Cada visual es estático con animación
 * CSS sutil (dash en flujos, pulso en estados). Con reduced-motion se
 * congelan. 0-atajos intacto: no duplican el blob ni su motor.
 * A11y (W3C Accessible SVG): figure con role=img + aria-label, svg
 * decorativo interno con aria-hidden; el texto hereda Outfit del sitio.
 */

import { outfit } from "@/app/fonts";

const INK = "#1a1a1a";
const MUTED = "#525252";
const ORANGE = "#cf4409";
const BLUE = "#3b4fe4";
const LINE = "rgba(0,0,0,0.14)";

function Frame({ label, children }) {
  return (
    <figure className={`case-visual ${outfit.className}`} role="img" aria-label={label}>
      {children}
    </figure>
  );
}

function Chip({ x, y, w, text, accent }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="26" rx="13" fill="#fff" stroke={LINE} />
      <circle cx={x + 15} cy={y + 13} r="4" fill={accent} />
      <text x={x + 24} y={y + 17} fontSize="11" fill={INK}>{text}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }) {
  return (
    <line className="case-flow" x1={x1} y1={y1} x2={x2} y2={y2} stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
  );
}

export default function CaseVisual({ kind }) {
  if (kind === "wordpress") {
    return (
      <Frame label="Diagrama de la plataforma WordPress: Astra, Elementor y WPForms alimentan las páginas del sitio">
        <svg viewBox="0 0 400 170" aria-hidden="true">
          <Chip x={12} y={14} w={110} text="Astra" accent={ORANGE} />
          <Chip x={12} y={48} w={130} text="Elementor" accent={BLUE} />
          <Chip x={12} y={82} w={122} text="WPForms" accent={ORANGE} />
          <Arrow x1={150} y1={27} x2={196} y2={60} />
          <Arrow x1={150} y1={61} x2={196} y2={68} />
          <Arrow x1={150} y1={95} x2={196} y2={78} />
          <rect x={200} y={34} width={188} height={102} rx="14" fill="#fff" stroke={LINE} />
          <rect x={200} y={34} width={188} height={22} rx="11" fill={BLUE} opacity="0.12" />
          <circle cx={214} cy={45} r="3" fill={BLUE} />
          <circle cx={224} cy={45} r="3" fill={ORANGE} />
          <text x={214} y={76} fontSize="12" fontWeight="600" fill={INK}>Inicio · Nosotros</text>
          <text x={214} y={94} fontSize="12" fill={MUTED}>Soluciones · Servicios</text>
          <text x={214} y={112} fontSize="12" fill={MUTED}>Contactos + roles</text>
        </svg>
      </Frame>
    );
  }
  if (kind === "dns") {
    return (
      <Frame label="Flujo de dominio y hosting: mundocloud.co pasa por DNS hacia el hosting cPanel">
        <svg viewBox="0 0 400 150" aria-hidden="true">
          <rect x={12} y={52} width={120} height={46} rx="14" fill="#fff" stroke={LINE} />
          <text x={26} y={72} fontSize="12" fontWeight="600" fill={INK}>mundocloud.co</text>
          <text x={26} y={88} fontSize="11" fill={MUTED}>DNS · registros</text>
          <Arrow x1={136} y1={75} x2={172} y2={75} />
          <rect x={176} y={52} width={96} height={46} rx="14" fill="#fff" stroke={ORANGE} />
          <text x={190} y={72} fontSize="12" fontWeight="600" fill={INK}>DNS</text>
          <text x={190} y={88} fontSize="11" fill={MUTED}>quizás Cloudflare</text>
          <Arrow x1={276} y1={75} x2={312} y2={75} />
          <rect x={316} y={40} width={72} height={70} rx="14" fill={INK} />
          <text x={328} y={66} fontSize="12" fontWeight="600" fill="#fff">cPanel</text>
          <text x={328} y={84} fontSize="11" fill="#e9e0cf">backups</text>
          <text x={328} y={98} fontSize="11" fill="#e9e0cf">cuentas</text>
        </svg>
      </Frame>
    );
  }
  if (kind === "ssl") {
    return (
      <Frame label="Diagrama SSL y cumplimiento: HTTPS con candado y aviso de cookies Complianz">
        <svg viewBox="0 0 400 150" aria-hidden="true">
          <rect x={12} y={40} width={180} height={70} rx="14" fill="#fff" stroke={LINE} />
          <rect x={26} y={56} width={14} height={12} rx="3" fill="none" stroke={ORANGE} strokeWidth="2" />
          <path d="M29 56 v-6 a4 4 0 0 1 8 0 v6" fill="none" stroke={ORANGE} strokeWidth="2" />
          <text x={48} y={68} fontSize="13" fontWeight="600" fill={INK}>https://…</text>
          <text x={26} y={94} fontSize="11" fill={MUTED}>SSL activo · redirección total</text>
          <Arrow x1={196} y1={75} x2={228} y2={75} />
          <rect x={232} y={40} width={156} height={70} rx="14" fill="#fff" stroke={LINE} />
          <circle className="case-pulse" cx={250} cy={62} r="6" fill={ORANGE} />
          <text x={262} y={66} fontSize="12" fontWeight="600" fill={INK}>Complianz</text>
          <text x={246} y={88} fontSize="11" fill={MUTED}>cookies + datos</text>
        </svg>
      </Frame>
    );
  }
  if (kind === "cache") {
    return (
      <Frame label="Capas de caché: visita servida por WP Super Cache y objetos por Docket Cache">
        <svg viewBox="0 0 400 170" aria-hidden="true">
          <rect x={12} y={20} width={104} height={40} rx="14" fill="#fff" stroke={LINE} />
          <text x={24} y={37} fontSize="12" fontWeight="600" fill={INK}>Visita</text>
          <text x={24} y={52} fontSize="11" fill={MUTED}>página corp.</text>
          <Arrow x1={120} y1={40} x2={152} y2={40} />
          <rect x={156} y={20} width={120} height={40} rx="14" fill="#fff" stroke={ORANGE} />
          <text x={168} y={37} fontSize="12" fontWeight="600" fill={INK}>Super Cache</text>
          <text x={168} y={52} fontSize="11" fill={MUTED}>HIT de página</text>
          <Arrow x1={216} y1={60} x2={216} y2={88} />
          <rect x={156} y={92} width={120} height={40} rx="14" fill="#fff" stroke={LINE} />
          <text x={168} y={109} fontSize="12" fontWeight="600" fill={INK}>Docket</text>
          <text x={168} y={124} fontSize="11" fill={MUTED}>objetos</text>
          <Arrow x1={280} y1={40} x2={308} y2={40} />
          <rect x={312} y={20} width={76} height={112} rx="14" fill={INK} />
          <text x={324} y={48} fontSize="12" fontWeight="600" fill="#fff">Origen</text>
          <text x={324} y={66} fontSize="11" fill="#e9e0cf">solo en</text>
          <text x={324} y={80} fontSize="11" fill="#e9e0cf">MISS</text>
        </svg>
      </Frame>
    );
  }
  if (kind === "media") {
    return (
      <Frame label="Optimización de medios: imagen pesada convertida a WebP ligera con carga diferida">
        <svg viewBox="0 0 400 150" aria-hidden="true">
          <rect x={12} y={40} width={140} height={70} rx="14" fill="#fff" stroke={LINE} />
          <rect x={24} y={56} width={116} height={12} rx="6" fill={MUTED} opacity="0.5" />
          <rect x={24} y={74} width={86} height={12} rx="6" fill={MUTED} opacity="0.3" />
          <text x={24} y={100} fontSize="11" fill={MUTED}>JPG · 1.2 MB</text>
          <Arrow x1={156} y1={75} x2={192} y2={75} />
          <rect x={196} y={40} width={140} height={70} rx="14" fill="#fff" stroke={BLUE} />
          <rect x={208} y={56} width={64} height={12} rx="6" fill={BLUE} opacity="0.7" />
          <rect x={208} y={74} width={48} height={12} rx="6" fill={BLUE} opacity="0.35" />
          <text x={208} y={100} fontSize="11" fill={MUTED}>WebP · 280 KB + lazy</text>
          <rect x={348} y={52} width={40} height={46} rx="12" fill={ORANGE} opacity="0.14" />
          <text x={354} y={72} fontSize="12" fontWeight="700" fill={ORANGE}>−77%</text>
          <text x={354} y={88} fontSize="11" fill={ORANGE}>peso</text>
        </svg>
      </Frame>
    );
  }
  // forms
  return (
    <Frame label="Flujo de formularios: WPForms registra el envío en SureMails y llega a la bandeja">
      <svg viewBox="0 0 400 150" aria-hidden="true">
        <rect x={12} y={40} width={110} height={70} rx="14" fill="#fff" stroke={LINE} />
        <rect x={24} y={56} width={86} height={8} rx="4" fill={MUTED} opacity="0.4" />
        <rect x={24} y={70} width={86} height={8} rx="4" fill={MUTED} opacity="0.25" />
        <rect x={24} y={86} width={52} height={14} rx="7" fill={ORANGE} />
        <text x={12} y={30} fontSize="11" fill={MUTED}>WPForms</text>
        <Arrow x1={126} y1={75} x2={158} y2={75} />
        <rect x={162} y={40} width={110} height={70} rx="14" fill="#fff" stroke={ORANGE} />
        <text x={174} y={62} fontSize="12" fontWeight="600" fill={INK}>SureMails</text>
        <text x={174} y={80} fontSize="11" fill={MUTED}>log de envíos</text>
        <circle className="case-pulse" cx={182} cy={96} r="4" fill={ORANGE} />
        <text x={192} y={100} fontSize="11" fill={MUTED}>entregado</text>
        <Arrow x1={276} y1={75} x2={308} y2={75} />
        <rect x={312} y={52} width={76} height={46} rx="14" fill={INK} />
        <text x={324} y={72} fontSize="16" fill="#fff">✉</text>
        <text x={344} y={72} fontSize="11" fill="#fff">bandeja</text>
        <text x={324} y={88} fontSize="11" fill="#e9e0cf">consultoría</text>
      </svg>
    </Frame>
  );
}

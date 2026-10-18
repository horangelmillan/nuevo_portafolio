# ALCANCE — Épico animación/interacción (referencia: cedricpereira.com)

> Definición viva del alcance. Aprobada por el usuario 2026-10-13.
> Orden de lectura: `AGENTS.md` → `docs/HARNESS.md` → `docs/ESTADO.md` → este archivo → código.

## Objetivo
Replicar la animación e interacción de la referencia con stack propio
(Next.js 15 + React 19 + Zustand + pnpm), sin dependencias nuevas y bajo la
regla estricta 0-atajos (gate 4 de `AGENTS.md`): un solo objeto vivo por
elemento animado, transiciones in-place verificadas contra el bundle real
(`/js/1.1.js`: matter-js + paper.js + GSAP + svg.js como especificación de
números y secuencia, nunca como código).

## Estado verificado
- Rama `feat/hero-canvas-integration`; PR #10 mergeado a `main`.
- Suite E2E + lint + build verdes (último validado: 235/235).
- Modelo vigente del caso: **cortina** (detalle dentro de Proyectos, canvas
  fijo, blob único). Regla 0-atajos con tests que la vigilan.

## Fases cerradas (gate visual + merge)
- **A1 carrusel** — drag con inercia, snap al centro, rubber-band, 5 tarjetas.
- **A2 blob** — canvas generativo por proyecto (forma/color por índice),
  paletas y fases por scroll.
- **A3 preloader + About + copy-email** — `%` por hitos, dialog con foco y
  trampa, clipboard con fallback.
- **A4 caso expandible** — morph in-place 1s `Circ.easeInOut`, overlay sin
  rutas ni recargas, auditoría H1–H4/R1–R3, modelo cortina. Gate visual dado.

## A5 — Sección Formación (siguiente)
Contenido: Academlo 2022 como origen (1 mención, como en Sobre mí) +
aprendizaje continuo (SAP BTP, MundoCloud). Formato a decidir al arrancar:
5ª sección real (navegable, highlight, snap incluido) o bloque dentro de
Sobre mí. El usuario aporta datos; el agente redacta. Incluye E2E y gate
visual. Sin commit hasta gate explícito.

## A6 — Casos reales con fotos
Sustituir placeholders (Portfolio/SAP BTP/Apps JS/Próximo) por casos con
demo + repo + métricas. Fotos 16:9 en `public/cases/` servidas con
`next/image`. Requiere del usuario: contenido por caso + imágenes. E2E por
caso + gate visual por caso.

## A7 — Deploy y cierre
Deploy Vercel (importar repo, `pnpm build`, sin env vars) + Lighthouse
(objetivo a11y 100) + re-test de perf en máquina del usuario + PR final a
`main` + merge (sin CI en el repo: validación agente + autorización usuario).

## Backlog transversal (no bloquea A5)
- Outfit en una sola vía (`next/font/local` + `next/font/google` conviven).
- [x] `font-family:'Outfit'` hardcodeado en `nav.css`/`link.css` → `inherit` (backlog 2026-10-18, pendiente commit).
- [x] `div.Navbar` → `nav` (landmark) (backlog 2026-10-18, pendiente commit).
- [x] Mapeo por índice frágil (mejor por id) en highlight y fases (backlog 2026-10-18, pendiente commit).
- [x] `waitForTimeout` → `waitForFunction` donde quede (backlog 2026-10-18: 34→0, pendiente commit).
- [x] Nits reviewer: `split("|")` frágil → JSON, `io.observe` duplicado fuera, `dataset.k=0` inicial explícito, `data-settled="0"` honesto, `image/gallery` fuera de `cases.js` (backlog 2026-10-18, pendiente commit). Quedan: aria-live en tarjetas.
- Auditoría dependencias dev-only (`js-yaml`, `brace-expansion` vía eslint).
- Validación manual auto-hide del header tras reiniciar `pnpm dev`.
- Limpieza `test-results/` y temporales `Temp/opencode` al cerrar épico.

## Gates vigentes
Requerimiento → plan → autorización explícita → implementar → E2E + lint +
build → reviewer → gate visual del usuario → commit → PR → merge.
**0 atajos**: violarlo es no-listo automático, sin excepciones.

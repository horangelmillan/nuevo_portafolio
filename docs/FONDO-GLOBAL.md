# Fondo vivo global + comportamientos por sección (épico siguiente)

> Doc de continuidad para la sesión de mañana. Estado del repo en `docs/ESTADO.md`.
> Reglas de orquestación: `AGENTS.md` + `docs/HARNESS.md` (Caso C).

## 1. Visión aprobada por el usuario

Un **único fondo vivo fijo** a viewport completo (`position:fixed`, detrás de todo),
sobre el que "suben" las 4 secciones al hacer scroll. El fondo **reacciona a la
sección visible**: cada sección tiene su **comportamiento propio** de cubos y su
**paleta propia** (los cubos se tiñen al bajar). Móvil: siempre activo.

Comportamientos (iteración por sección con aprobación visual, como fases 1–7):

| Sección | Estado | Comportamiento |
|---|---|---|
| Hero | ✅ aprobado (v7 integrado) | Pila desordenada actual, regresión intacta |
| Sobre mí | 🔲 por diseñar | Embudo + lluvia: al bajar, los cubos son atraídos a un punto móvil (boca del embudo), caen como regadera, se desvanecen abajo y reaparecen arriba (loop sin acumulación real) |
| Proyectos | 🔲 por diseñar | TBD con el usuario |
| Contacto | 🔲 por diseñar | TBD con el usuario |

Paletas: probar varias por sección (hero = cálida actual). Transiciones sin "pop"
mediante mezcla por progreso de scroll.

## 2. Decisiones ya tomadas (no reabrir sin motivo)

- Geometría prod: `cubos`; fondo full-bleed (compensa `.body margin 0 3em`).
- `/hero-lab` intacto y untracked: checkpoint, NO borrar hasta validación posterior.
- Móvil: fondo siempre pintando (sin pausa offscreen).
- Tope presentación 30fps con física intacta (anti-jank GPU, aprobado tras trace).
- Scroll: sin `scroll-snap-type` (medido: mandatory y proximity devuelven micro-ruedas);
  `smooth` se conserva; rAF-throttle en `useScrollData`; footer sin re-suscripciones.
- Config prod completa en `hero-config.js` (semilla fija 12, ver §3).

## 3. Configuración de producción vigente

Geometría `cubos`, count 260, auto off, densidad 200%, tamaño 150%, velocidad
0.50x, paleta `calida`, fondo `claro`, sombra `#000000` 65/45/100 centro 25/100,
contorno 100%, orientación 100%, protección 0%, halo on 100%, DPR máx 2, seed 12.
Equivalencia: manual 260×200% → topes 260 desktop / 140 móvil (caps del motor).

## 4. Mapa del motor actual (qué reutilizar)

- `section/components/hero-background/`: `hero-field.js` (motor puro: RNG con
  streams separados, clusters anclados a safe zone, tiers tiny→XXL, resample con
  aceptación, Path2D por pieza, gradientes cacheados por quantum, bg+sombra en
  offscreens, culling, color numérico sin allocs), `HeroBackground.jsx` (loop rAF
  con dt real + presentación 30fps, RO/IO/visibility, matchMedia, fallback sin
  canvas), `hero-config.js`, `hero-background.css` (capas + halo + full-bleed).
- Claves duras del diseño: semilla fija = layout estable; aleatoriedad solo en
  effects (sin hydration mismatch); canvas `pointer-events:none` + `aria-hidden`;
  texto siempre HTML; detector: `measureZone` sobre DOM real + fallback.

## 5. Refactor base (primer paso de mañana, sin cambio visual)

1. Motor gana **campos de comportamiento**: función velocidad/comportamiento por
   fase + `faseActiva` + mezcla por progreso de scroll (scrollY + offsets
   cacheados, recalculados solo en resize; scrollY es gratis, sin layout).
2. **Morph de paleta** por fase (segundo eje de lerp sobre el actual).
3. Canvas fijo a nivel `page.js`; secciones a fondo transparente; safe zone +
   halo **por sección** (medir cada contenido, no solo el H1).
4. Quitar pausa offscreen (siempre visible); mantener `visibilitychange` y
   reduced-motion (frame estático por fase).
5. Regresión: hero idéntico píxel a píxel (misma semilla + fase hero = v7).

## 6. Workflow por comportamiento (repetir por sección)

1. `explorer`: archivos implicados (solo lectura).
2. Diseñar en laboratorio: añadir selector de fase + slider de progreso a
   `/hero-lab` (temporal) para previsualizar fase y transiciones.
3. Iterar hasta **aprobación visual explícita** del usuario (gate).
4. Integrar fase en el motor + `reviewer` (diff, lint, build).
5. E2E: fase visible al hacer scroll, sin regresión de contraste/RM/responsive.
6. Solo entonces, siguiente sección. Nada de batch sin aprobación.

## 7. Orquestación (Caso C, `AGENTS.md` §Orquestación)

Principal = único decisor. `explorer` → `researcher` solo ante incertidumbre
técnica real (docs oficiales primero) → análisis → plan en lenguaje sencillo →
**autorización explícita** → implementar → `reviewer` → pruebas → validación
usuario → git/PR/CI/merge. Delegación secuencial; resultados de subagentes =
información, nunca aprobación. Gates inviolables: ningún subagente implementa,
aprueba por el usuario ni toca git.

## 8. Validación y riesgos

- `pnpm lint` + `next build` (con dev apagado: jamás build con dev vivo, mismo
  `.next`) + E2E (`pnpm test:e2e`; extender: canvas fijo, fase por scroll,
  secciones transparentes) + trace de perf **en máquina del usuario** (headless
  no reproduce GPU: raster por software).
- Presupuesto: 30fps presentación, DPR≤2 (revisar 1.5 móvil si hace falta, con
  aprobación), Path2D, offscreens, culling, color numérico.
- Riesgos: pops en transición de fases (mitiga mezcla por progreso); contraste
  por paleta y sección (safe zone + halo por sección); batería móvil con canvas
  siempre activo; `backdrop-filter` de la nav sobre canvas (coste medido en
  trace: no tocar sin evidencia nueva); `transition:none` en nav ya descartado
  como fix por el usuario.

## 9. Entrypoint sesión de mañana

1. Leer `AGENTS.md` → `docs/HARNESS.md` → `docs/ESTADO.md` → este archivo.
2. `git status`: hay trabajo sin commitear (scroll + perf 30fps + `scroll.spec.js`;
   commit pendiente de validación del usuario) + `AGENTS.md`/`HARNESS.md`
   modificados por terceros (no tocar).
3. Dev en `:3100` (`pnpm dev --turbopack`); E2E levanta el suyo (webServer).
4. Empezar por §5 (refactor base) con plan + autorización antes de implementar.

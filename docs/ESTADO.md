# Estado del proyecto (continuidad entre sesiones)

> Consultar al inicio de cada tarea; actualizar al cerrarla. Sin redundancia: lo obvio del código no se duplica aquí.

## Decisiones

- Retoma sobre `horangelmillan/nuevo_portafolio` (Next 15 + React 19 + Zustand); repo viejo `Portfolio` (CRA+Express) queda como referencia de solo lectura.
- Rama de trabajo: `retoma/portafolio`. `main` intacto hasta PR validado.
- Migrado npm → pnpm (`pnpm-lock.yaml`, `packageManager pnpm@11.11.0`, `.nvmrc` 22, `.gitattributes eol=lf`). Next `15.5.26`, `eslint-config-next` alineado, `lint` = `eslint src`.
- Scroll-hijack de `Body` eliminado (scroll nativo + snap CSS); 4 secciones reales; `Section` con guard nulo.
- Header auto-hide corregido: `useScrollNavbar` lee `window.scrollY` con ref + `throttle 150ms` (antes dependía de `storeScrollData` y el `cancel()` del throttle anulaba el ocultado).
- Fuentes: `Outfit` idéntica al original; `Cinzel` pasó de Regular fijo a Variable; `EBGaramond` no migrada (peso muerto, 0 usos).
- Hero generativo integrado en producción (PR #1 → `main` en `e9cc526`): cubos perfectos, semilla fija 12, paleta cálida, fondo claro full-bleed, sombra independiente, DPR≤2, reduced-motion con frame estático. Config en `hero-config.js`. `/hero-lab` intacto y untracked como checkpoint (NO borrar aún).
- Playwright E2E propio (Chromium gestionado, webServer `:3100`): `tests/e2e/hero.spec.js` (10 tests × desktop/móvil) + `hero-perf.spec.js` + `scroll.spec.js`. Problema CDP anterior = nunca hubo Playwright en el repo (era la herramienta MCP externa).
- Scroll: eliminado `scroll-snap-type` (medido en E2E: mandatory y proximity devuelven micro-ruedas, avance 0); `smooth` conservado; rAF-throttle en `useScrollData`; footer sin re-suscripciones por scroll.
- Rendimiento hero (trace en máquina del usuario: frames de ~1.1s, scripting bajo → cuello GPU/compositor, no JS): color numérico sin allocs, culling fuera de clip, Path2D por pieza, bg+sombra en offscreens, **presentación topada a 30fps con física intacta** (deriva ~2px/s: indistinguible).
- Visión aprobada siguiente épico: fondo vivo fijo global + comportamientos y paletas por sección (hero = pila actual; sobre mí = embudo+lluvia; resto TBD), iterado por sección con aprobación visual. Detalle en `docs/FONDO-GLOBAL.md`.

## Pendientes (FOLLOW-UP)

- [ ] Validación manual del usuario del auto-hide del header tras reiniciar `pnpm dev`.
- [ ] Unificar doble `Outfit` (`next/font/local` en `section.js` + `next/font/google` en `link.js`) en una sola vía.
- [ ] Auditoría: quedan ~20 highs transitivos dev-only (`js-yaml`, `brace-expansion` vía eslint); reevaluar al actualizar toolchain.
- [ ] Deploy Vercel (importar repo, `pnpm build`, sin env vars) + Lighthouse.
- [ ] **Sin commitear** (pendiente validación usuario): fix scroll (globals/body/useScrollData/useScrollFooter) + perf 30fps + `scroll.spec.js`. `AGENTS.md`/`HARNESS.md` modificados por terceros: no incluir.
- [ ] Re-test de perf en máquina del usuario tras el tope 30fps (comparar bloques amarillos del trace).
- [ ] Validar DPR real/viewport del usuario si reaparecen frames largos (`innerWidth/innerHeight/devicePixelRatio` + `chrome://gpu`).
- [x] Épico fondo global §5 refactor base (VALIDADO por usuario: visualmente idéntico). Canvas fijo global + fase/progreso por scroll + morph no-op (4×cálida) + zones por sección (genera con hero) + sin pausa offscreen. `hero-config.js` intacto (seed 12). VALIDADO AGENTE: `pnpm lint` ✓, `next build` ✓, E2E 34/34 ✓, `reviewer` listo-con-condición ✓. Sin commit ni PR aún.
- [x] Fix responsive hero (VALIDADO por usuario). `section.css` clamp con techos desktop + `overflow-wrap`; gutters fluidos en `body.css`+`hero-background.css`; matriz E2E a55/pixel9/tablet + test 7 endurecido + flick scroll proporcional. VALIDADO AGENTE: lint ✓, build ✓, E2E 85/85 ✓, `reviewer` listo ✓. Sin commit ni PR aún (pendiente decisión usuario: commit/PR vs. fase sobre-mí).
- [ ] FOLLOW-UP reviewer: footer sin regla transparente (tapa canvas en contacto si es opaco); offsets solo en resize (invalidar tras `fonts.ready`); acoplamiento `PHASES[i]↔sections[i]` por índice; `fondo-global.spec` usa `waitForTimeout` (mejor `waitForFunction` fase).

## Última sesión

- Hero integrado + mergeado (PR #1), E2E 22/22→28/28 en verde, scroll corregido con evidencia E2E, auditoría de perf con trace del usuario (cuello GPU) + tope 30fps. Todo documentado en `docs/FONDO-GLOBAL.md` para la sesión de mañana.

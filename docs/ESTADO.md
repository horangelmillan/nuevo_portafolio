# Estado del proyecto (continuidad entre sesiones)

> Consultar al inicio de cada tarea; actualizar al cerrarla. Sin redundancia: lo obvio del código no se duplica aquí.

## Decisiones

- Retoma sobre `horangelmillan/nuevo_portafolio` (Next 15 + React 19 + Zustand); repo viejo `Portfolio` (CRA+Express) queda como referencia de solo lectura.
- Rama de trabajo: `retoma/portafolio`. `main` intacto hasta PR validado.
- Migrado npm → pnpm (`pnpm-lock.yaml`, `packageManager pnpm@11.11.0`, `.nvmrc` 22, `.gitattributes eol=lf`). Next `15.5.26`, `eslint-config-next` alineado, `lint` = `eslint src`.
- Scroll-hijack de `Body` eliminado (scroll nativo + snap CSS); 4 secciones reales; `Section` con guard nulo.
- Header auto-hide corregido: `useScrollNavbar` lee `window.scrollY` con ref + `throttle 150ms` (antes dependía de `storeScrollData` y el `cancel()` del throttle anulaba el ocultado).
- Fuentes: `Outfit` idéntica al original; `Cinzel` pasó de Regular fijo a Variable; `EBGaramond` no migrada (peso muerto, 0 usos).

## Pendientes (FOLLOW-UP)

- [ ] Validación manual del usuario del auto-hide del header tras reiniciar `pnpm dev`.
- [ ] Unificar doble `Outfit` (`next/font/local` en `section.js` + `next/font/google` en `link.js`) en una sola vía.
- [ ] Auditoría: quedan ~20 highs transitivos dev-only (`js-yaml`, `brace-expansion` vía eslint); reevaluar al actualizar toolchain.
- [ ] Deploy Vercel (importar repo, `pnpm build`, sin env vars) + Lighthouse.

## Última sesión

- Harness mínimo creado (`AGENTS.md`, `docs/HARNESS.md`, `docs/ESTADO.md`, `.opencode/agents/*`). Publicado en `retoma/portafolio`.

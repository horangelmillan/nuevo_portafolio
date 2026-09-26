# Portafolio — instrucciones para agentes (Harness mínimo)

> Puerta de entrada. Este archivo manda sobre reglas globales. Flujo completo en `docs/HARNESS.md`. Estado vivo en `docs/ESTADO.md`.

## Proyecto

Next.js 15 + React 19 + Zustand + pnpm. Node 22 (`nvm use`, `corepack enable`). Rama de retoma: `retoma/portafolio` (base `main` en `horangelmillan/nuevo_portafolio`).

```bash
pnpm install --frozen-lockfile
pnpm dev      # http://localhost:3000
pnpm lint     # eslint src
pnpm build
```

## Principios

Optimizar **calidad + velocidad + contexto + verificabilidad**. Cambio mínimo (ponytail): YAGNI, reutilizar antes que crear, sin dependencias ni abstracciones no pedidas. No programar por síntoma: primero causa raíz. No afirmar que algo funciona sin validarlo.

## Profundidad adaptativa

- **Trivial** (texto, CSS aislado, cambio localizado evidente): análisis corto → plan breve → implementar → `lint`/`build`. Sin subagentes.
- **Medio**: `explorer` → `researcher` solo si hay incertidumbre → implementar → `reviewer`.
- **Grande/arquitectónico**: `explorer` → `researcher` → plan → implementar → `reviewer`.
- El principal puede alterar la secuencia si el caso lo justifica. Delegar solo cuando reduzca riesgo o ahorre trabajo.

## Gates (no saltables)

1. **Implementar** solo con autorización explícita del usuario tras explicar el plan en lenguaje sencillo (qué, por qué, archivos, riesgos, cómo se probará).
2. **Commit/PR** solo tras validación del usuario. PR hacia `main` con pruebas realizadas. Merge solo con CI verde (si existe).
3. Un subagente **nunca** cambia el objetivo ni implementa por su cuenta: informa, el principal decide.

## Agentes (`.opencode/agents/`, mecanismo oficial OpenCode)

| Agente | Rol | Cuándo |
|---|---|---|
| `explorer` | Estructura, archivos relevantes, dependencias, impacto, convenciones. Solo lectura. | Cambio con complejidad que justifique exploración |
| `researcher` | Docs oficiales, APIs, versiones, errores. Vía Context7 + web. Solo lectura. | Incertidumbre técnica o riesgo de iteración vacía |
| `reviewer` | Revisa diff, detecta errores/efectos, corre `lint`/`build`. No edita. | Tras cada implementación no trivial |

Salida de subagentes: información estructurada y concisa al principal (hallazgos, riesgos, recomendaciones, listo/no-listo).

## Skills y MCP

Usar skill/MCP solo si aporta valor real, nunca por cumplir. Priorizar docs oficiales versionadas (Context7: `resolve-library-id` → `query-docs`). Skills globales útiles: `ponytail`, `verification-before-completion`, `systematic-debugging`, `webapp-testing`/`playwright-best-practices`, `vercel-*`. Si falta capacidad y la tarea lo justifica: evaluar `skills.sh`, instalar solo lo necesario.

## Hallazgos y continuidad

Registrar durante el trabajo en `docs/ESTADO.md`: `BLOCKER` (resolver antes de terminar), `FOLLOW-UP` (resolver si es razonable o dejar documentado), `INFORMATION`. Consultar `docs/ESTADO.md` al inicio de cada tarea; actualizarlo al cerrarla. Sin redundancia.

## Orden de lectura

`AGENTS.md` → `docs/HARNESS.md` → `docs/ESTADO.md` → código.

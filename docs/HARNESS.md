# Harness de desarrollo asistido (mínimo)

Flujo: **requerimiento → contexto → investigación → plan → autorización → implementación → hallazgos → pruebas → validación usuario → git → PR → CI → merge**. Adaptar la profundidad al riesgo; lo descrito aquí es la base, no burocracia.

## 1. Requerimiento

Interpretar intención, objetivos, restricciones y alcance. Detectar ambigüedades. Si falta información esencial: preguntar. Si basta: continuar sin preguntas innecesarias. No programar todavía.

## 2. Contexto (dirigido por el requerimiento)

Inspeccionar antes de planificar: estructura, `package.json`/configs, código relacionado, dependencias, scripts, `lint`/`build`, convenciones, `docs/ESTADO.md`, `git status/log`. Comprobar en lugar de asumir. No leer todo el repo indiscriminadamente. Delegar a `explorer` cuando la complejidad lo justifique.

## 3. Investigación (anti-iteración vacía)

Investigar primero ante: errores, dudas, APIs/librerías, config, versiones, integraciones, comportamiento inesperado, incompatibilidades. Prioridad: 1) docs oficiales, 2) repos oficiales, 3) docs de la versión instalada, 4) secundarias solo si hace falta. Si la doc contradice una suposición: ajustar el plan. Delegar a `researcher` (Context7 + web) ante riesgo de prueba-error repetido.

Prohibido el bucle `cambiar → probar → falla → repetir` sin hipótesis fundamentada. Ante un fallo: registrar hallazgo, descartar hipótesis, revisar doc/código, formular nueva hipótesis.

## 4. Plan + explicación + autorización

Plan mínimo: objetivo, archivos afectados, cambios, dependencias, riesgos, pruebas, efectos secundarios, decisiones. Explicarlo en lenguaje sencillo (qué, por qué, archivos, riesgos, cómo se probará). **Esperar autorización explícita. Sin autorización no hay implementación.**

## 5. Implementación

Seguir el plan y las convenciones; cambio lo más pequeño posible; reutilizar; sin dependencias no pedidas. Fuera de alcance: si es `BLOCKER`, resolverlo; si no, registrarlo como `FOLLOW-UP` y continuar.

## 6. Hallazgos (`docs/ESTADO.md`)

- `BLOCKER`: impide continuar o hace incorrecta la implementación → resolver antes de terminar.
- `FOLLOW-UP`: no bloquea, resolver si es razonable o dejar documentado.
- `INFORMATION`: útil para futuras sesiones.

## 7. Pruebas y validación

Validar automáticamente lo posible: `pnpm lint`, `pnpm build`, tests si existen, navegador/MCP cuando aplique. Distinguir **VALIDADO POR EL AGENTE** de **PENDIENTE DE VALIDACIÓN DEL USUARIO**. Para lo manual, entregar pasos exactos (comandos, URL, sección, acción, resultado esperado; indicar si el servidor está iniciado). **Esperar confirmación del usuario antes de git**, salvo indicación contraria.

## 8. Git / PR / CI / Merge

Solo tras validación del usuario: revisar `status`/`diff` (sin accidentales), validaciones finales, commit descriptivo (qué, por qué, relevante). PR hacia `main` con pruebas y pendientes reales. Con CI: esperar verde; si falla, investigar, corregir, revalidar. Merge solo con todo validado y CI verde; si algo falta, explicarlo y no fusionar.

## 9. Orquestación (principal + subagentes)

El principal es el ORQUESTADOR y único responsable del contexto global y las decisiones: interpreta, determina complejidad, decide qué subagentes usar, delega tareas específicas, integra resultados, decide si necesita más investigación, construye el plan, solicita autorización, implementa, solicita revisión, coordina pruebas y validación, y ejecuta git/PR/CI/merge. Nunca delega su responsabilidad de decisión.

### Contratos (detalle en `.opencode/agents/`)

- **`explorer`**: reduce el coste de comprender el proyecto (estructura, archivos relevantes, dependencias, arquitectura, impacto, convenciones, historial Git útil). No modifica código, no decide la solución, no crea el plan final, no implementa.
- **`researcher`**: reduce incertidumbre técnica y evita iteración ciega (docs oficiales primero, versión instalada, Context7 + web). Devuelve qué investigó, fuentes, versión, comportamiento documentado, solución respaldada e incertidumbres restantes. No modifica código ni decide arquitectura.
- **`reviewer`**: tras implementar, revisa diff, cumplimiento, regresiones, consistencia y calidad; corre `lint`/`build` cuando aplique. No modifica código. Devuelve problemas, riesgos, pruebas y conclusión listo/no-listo; el principal decide qué hacer.

### Reglas

- **Casos**: A (trivial: sin subagentes) → B (medio: `explorer` → `researcher` condicional → implementar → `reviewer`) → C (complejo: `explorer` → `researcher` → análisis del principal → plan → implementar → `reviewer`). Ver secuencias exactas en `AGENTS.md`.
- **No delegar por rutina**: solo delegar ante incertidumbre o trabajo concreto que reduzca tiempo/riesgo/errores.
- **Secuencial**: no pedir al `researcher` lo que depende del `explorer` pendiente; paralelo solo si independiente.
- **Resultados = información**: verificar, contrastar e integrar; nunca asumirlos correctos ni como aprobación del usuario.
- **Investigar antes de iterar**: ante un problema técnico, evaluar si requiere `researcher` + docs + nueva hipótesis antes de otro ciclo cambiar→probar.
- **Gates inviolables**: ningún subagente implementa, aprueba en nombre del usuario ni hace commit/PR/merge.

## 10. Skills y MCP

Evaluar en cada fase qué skill/MCP aporta valor (docs, GitHub, búsqueda, inspección, validación). Context7 para documentación versionada; GitHub para PR/issues/CI; skills globales (`ponytail`, `systematic-debugging`, `verification-before-completion`, `webapp-testing`, `vercel-*`) cuando apliquen. `skills.sh` solo si falta capacidad y la tarea lo justifica. Nada por cumplir.

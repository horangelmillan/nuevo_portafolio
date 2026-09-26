# Portafolio — Horangel Millan

Next.js 15 + React 19 + Zustand. Migrado a **pnpm** por seguridad.

## Requisitos

Node 22 (`nvm use`), `corepack enable`.

## Desarrollo

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm build
```

## Deploy en Vercel

Importar `horangelmillan/nuevo_portafolio` (rama `main`), framework Next.js, build `pnpm build`. Sin env vars requeridas.

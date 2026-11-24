# Playground

App for testing, experimenting, and viewing UI inside the rk monorepo. React + Vite + Tailwind CSS.

- Run: `pnpm dev` here, or `pnpm --filter @rk/playground dev` from the repo root. This package has `dev`, `lint`, `lint:fix`, and `typecheck` scripts.
- Vite root is `src`, so `index.html` lives in `src/`.
- Routing: React Router, with routes in `src/app.tsx` and pages in `src/pages/`. The home page lists the available pages; the editor demo lives at `/editor` with a Markdown/HTML input-format switcher and live output panels.
- `@rk/editor` resolves to `packages/editor/src` through Vite and tsconfig path aliases, so the playground runs without building the editor package first.
- Theme: shadcn-style oklch tokens in `src/global.css`, exposed as Tailwind utilities (`bg-background`, `text-foreground`, ...). Dark mode is a `dark` class on `<html>`.
- Theme behavior: defaults to the system theme; pressing `d` toggles light/dark (logic in `src/utils/theme.ts`).
- Shared dependency versions come from the workspace `catalog` in `pnpm-workspace.yaml` — never pin them here.

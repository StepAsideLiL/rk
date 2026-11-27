# @rk/playground

React + Vite + Tailwind app for testing, experimenting, and viewing UI in the rk
monorepo.

## Setup

- Package: `@rk/playground` (`apps/playground`), pnpm + Turborepo.
- Run from the repo root with `pnpm playground` or
  `pnpm --filter @rk/playground dev`.
- Local scripts: `dev`, `lint`, `lint:fix`, `typecheck`. There is no `build` or
  `test` script.
- Vite root is `src`, so `src/index.html` is the entry document.
- `@rk/editor` resolves to `packages/editor/src` through Vite and TypeScript
  aliases, so this app runs without building the editor package first.
- Shared dependency versions come from the workspace `catalog` in
  `pnpm-workspace.yaml`; never pin shared versions here.
- This app has no local Oxc overrides; its `tsconfig.json` extends the root
  base configuration.
- See the repository root `AGENTS.md` for workspace-wide rules.

## Layout

- `src/app.tsx` defines the React Router routes.
- `src/pages/` contains route pages, including the home page, the `/editor`
  demo, and the `/ui/react/*` component demos.
- `src/components/app-shell.tsx` provides the shared app frame.
- `src/utils/theme.ts` holds theme detection and the keyboard toggle.
- `src/global.css` defines the Tailwind import, shadcn-style oklch tokens,
  `@theme` utilities, and playground-only component styles.
- `src/main.tsx` mounts the app, and `src/index.html` is the Vite entry page.
- `vite.config.ts` configures the Vite root and editor source aliases;
  `tsconfig.json` mirrors those aliases for typechecking.
- `README.md` documents the available pages and theme behavior.

## Rules

- Add routes in `src/app.tsx` and pages under `src/pages/`. Keep the home page
  listing the available demos.
- Keep the editor demo at `/editor` working with both Markdown and HTML input
  modes, including the live output panels.
- Import packages through their public entry points. The editor source alias is
  for local development; do not reach into other package internals.
- Use `@rk/ui` exports for UI demos under `src/pages/ui/react/`.
- Keep theme tokens and Tailwind setup in `src/global.css`. Use the existing
  utilities (`bg-background`, `text-foreground`, ...) instead of hard-coded
  colors.
- Preserve the theme behavior: follow the system theme by default and toggle
  light/dark with `d` unless a task explicitly changes it.
- Use workspace `catalog:` versions for shared dependencies; never pin them in
  this package.
- Keep TypeScript strict; no `any` without a comment explaining why.

## Building and checking

- `pnpm --filter @rk/playground dev` starts the Vite dev server.
- `pnpm --filter @rk/playground typecheck` checks the app and Vite config.
- `pnpm --filter @rk/playground lint` applies Oxlint/Oxfmt fixes, then checks
  the package.
- There is no test or build script. Verify changes in the dev server, including
  `/`, `/editor`, and the affected `/ui/react/*` pages.
- Run `pnpm check` from the repo root; Turbo skips the missing test and build
  tasks for this app.

## Documents

- No package-specific documents. Workspace guidance lives in the root
  `AGENTS.md` and `docs/`.

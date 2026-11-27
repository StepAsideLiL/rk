# @rk/playground

React + Vite + Tailwind app for testing, experimenting, and viewing UI in the rk
monorepo.

## Setup

- Package: `@rk/playground` (`apps/playground`), pnpm + Turborepo.
- Run from the repo root with `pnpm playground` or
  `pnpm --filter @rk/playground dev`.
- Local scripts: `dev`, `lint`, `lint:fix`, `typecheck`. There is no `build` or
  `test` script.
- React Router framework mode runs with `ssr: false` (SPA);
  `react-router.config.ts` sets `appDirectory` to `src`.
- `src/routes.ts` enables file routes with `@react-router/fs-routes`
  (`flatRoutes`), so files in `src/routes/` map to URLs.
- `@rk/editor` resolves to `packages/editor/src` through Vite and TypeScript
  aliases, so this app runs without building the editor package first.
- Shared dependency versions come from the workspace `catalog` in
  `pnpm-workspace.yaml`; never pin shared versions here.
- This app has no local Oxc overrides; its `tsconfig.json` extends the root
  base configuration.
- See the repository root `AGENTS.md` for workspace-wide rules.

## Layout

- `src/root.tsx` is the root route and document shell; it renders
  `src/components/app-shell.tsx`.
- `src/routes.ts` exports the `flatRoutes()` config from
  `@react-router/fs-routes`.
- `src/routes/` holds file routes: `_index.tsx` is `/`, dots become path
  segments (`ui.react.button.tsx` is `/ui/react/button`), and `_index` marks an
  index route.
- `src/components/` holds shared UI such as the app frame and `ui-page.tsx`.
- `src/utils/theme.ts` holds theme detection and the keyboard toggle.
- `@rk/ui/global.css` (from `packages/ui/src/style/global.css`) defines the
  Tailwind import, shadcn-style oklch tokens, `@theme` utilities, and shared
  component styles.
- `react-router.config.ts` enables SPA mode and points the app directory at
  `src`; `vite.config.ts` wires the React Router and Tailwind plugins, the
  editor source aliases, and prebundles the entry/UI deps to avoid first-load
  optimize-dep 504s. `tsconfig.json` mirrors those aliases for typechecking.
- `README.md` documents the available pages and theme behavior.

## Rules

- Add routes as files under `src/routes/` following the flat-routes convention;
  do not add a manual route table. Keep the home page listing the available
  demos.
- Keep the editor demo at `/editor` working with both Markdown and HTML input
  modes, including the live output panels.
- Import packages through their public entry points. The editor source alias is
  for local development; do not reach into other package internals.
- Use `@rk/ui` exports for UI demos under `src/routes/ui.react.*`.
- Keep theme tokens and Tailwind setup in `packages/ui/src/style/global.css`,
  imported as `@rk/ui/global.css`. Use the existing utilities
  (`bg-background`, `text-foreground`, ...) instead of hard-coded colors.
- Preserve the theme behavior: follow the system theme by default and toggle
  light/dark with `d` unless a task explicitly changes it.
- Use workspace `catalog:` versions for shared dependencies; never pin them in
  this package.
- Keep TypeScript strict; no `any` without a comment explaining why.

## Building and checking

- `pnpm --filter @rk/playground dev` starts React Router's Vite dev server.
- `pnpm --filter @rk/playground typecheck` checks the app and config files.
- `pnpm --filter @rk/playground lint` applies Oxlint/Oxfmt fixes, then checks
  the package.
- There is no test or build script. Verify changes in the dev server, including
  `/`, `/editor`, and the affected `/ui/react/*` pages.
- Run `pnpm check` from the repo root; Turbo skips the missing test and build
  tasks for this app.

## Documents

- No package-specific documents. Workspace guidance lives in the root
  `AGENTS.md` and `docs/`.

# @rk/desktop

Electron desktop app for rk, built with electron-vite, React, TypeScript, and
Tailwind CSS v4.

## Setup

- Package: `@rk/desktop` (`apps/desktop`), pnpm + Turborepo.
- Run commands from the repo root with the package filter, for example
  `pnpm --filter @rk/desktop dev`.
- Local scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `lint:fix`,
  `package`, `package:win`, `package:mac`, `package:linux`.
- The app builds as CommonJS so the sandboxed preload script can load. Do not
  add `"type": "module"` to this package.
- Shared dependency versions come from the workspace `catalog` in
  `pnpm-workspace.yaml`; never pin shared versions here.
- See the repository root `AGENTS.md` for workspace-wide rules.

## Layout

- `src/main` is the Electron main process. `src/main/ipc/` holds one file per
  IPC domain and registers `ipcMain.handle` handlers.
- `src/preload` exposes a narrow, typed API through `contextBridge`. Never
  expose `ipcRenderer` directly. `index.d.ts` supplies the `window.api` type.
- `src/shared` contains IPC channel names and payload types shared by main,
  preload, and renderer.
- `src/renderer` is the React app. `@renderer/*` maps to `src/renderer/src/*`,
  and `@shared/*` maps to `src/shared/*` in both TypeScript and electron-vite.
- `src/renderer/src/lib/ipc.ts` wraps the preload API for renderer code.
- `src/renderer/src/assets/main.css` configures Tailwind v4 CSS-first with
  `@import "tailwindcss"` and `@theme` tokens. There is no
  `tailwind.config.js`.
- `electron.vite.config.ts` defines the main, preload, and renderer builds.
  `electron-builder.yml` controls packaging and `resources/` holds build assets.
- Local `oxlint.config.ts` extends the root config. `oxfmt.config.ts` reuses the
  root formatting options because Oxfmt has no `extends` option.

## Rules

- Keep `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`
  in every `BrowserWindow`; do not weaken them for convenience.
- Expose IPC only through the typed preload bridge. Add channel names and
  payload types to `src/shared/ipc-channels.ts` before wiring main and preload.
- Keep one IPC domain per file in `src/main/ipc/` and register handlers from
  `src/main/index.ts`.
- Renderer code must use `window.api` through the renderer IPC helpers, never
  the Electron or Node APIs directly.
- Keep Tailwind configuration in `src/renderer/src/assets/main.css`; do not add
  a JavaScript Tailwind config.
- Extend or override root configs in this package. Do not edit root configs for
  app-specific needs.
- Use workspace `catalog:` versions for shared dependencies. Keep app-only
  dependencies pinned only when they are not shared.
- Keep TypeScript strict; no `any` without a comment explaining why.

## Building and checking

- `pnpm --filter @rk/desktop dev` starts electron-vite with main and renderer
  hot reload.
- `pnpm --filter @rk/desktop typecheck` checks the node and web TypeScript
  projects.
- `pnpm --filter @rk/desktop lint` applies Oxlint/Oxfmt fixes, then checks the
  package.
- `pnpm --filter @rk/desktop build` writes the app bundles to `out/`.
- `pnpm --filter @rk/desktop package` packages the existing `out/` build with
  electron-builder; run `build` first. `package:win`, `package:mac`, and
  `package:linux` build platform targets. Artifacts go to `apps/desktop/dist`.
- There is no test script; verify changes with typecheck, build, package checks,
  and a manual run of the app.
- Run `pnpm check` from the repo root for cross-package changes.

## Documents

- No package-specific documents. Workspace guidance lives in the root
  `AGENTS.md` and `docs/`.

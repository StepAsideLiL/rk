# @rk/desktop

Electron desktop app for rk, built with electron-vite, React, TypeScript, and
Tailwind CSS v4.

- `src/main` is the Electron main process. `src/main/ipc/` holds one file per
  IPC domain and registers `ipcMain.handle` handlers.
- `src/preload` exposes a narrow, typed API through `contextBridge`. Never
  expose `ipcRenderer` directly. `index.d.ts` supplies the `window.api` type.
- `src/shared` contains IPC channel names and payload types shared by main,
  preload, and renderer.
- `src/renderer` is the React app. `@renderer/*` maps to
  `src/renderer/src/*`, and `@shared/*` maps to `src/shared/*` in both
  TypeScript and electron-vite.
- Tailwind v4 is configured CSS-first in `src/renderer/src/assets/main.css`
  with `@import "tailwindcss"` and `@theme` tokens. There is no
  `tailwind.config.js`.
- Local `oxlint.config.ts` extends the root config. `oxfmt.config.ts` reuses
  the root formatting options because Oxfmt has no `extends` option.
- The app builds as CommonJS so the sandboxed preload script can load. Keep
  `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`.

Commands: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`,
`pnpm lint:fix`, `pnpm package`, `pnpm package:win`, `pnpm package:mac`,
`pnpm package:linux`.

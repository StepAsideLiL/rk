# rk

TypeScript monorepo managed with pnpm and Turborepo. The desktop app lives in
`apps/desktop` and is built with Electron, electron-vite, React, TypeScript, and
Tailwind CSS v4.

## Install

```sh
pnpm install
```

This repo uses pnpm 12, which reads build-script approvals from
`allowBuilds` in `pnpm-workspace.yaml` (the replacement for
`pnpm.onlyBuiltDependencies`). Electron, esbuild, and electron-winstaller are
approved there.

## Desktop app

```sh
pnpm dev --filter @rk/desktop
pnpm build --filter @rk/desktop
pnpm --filter @rk/desktop dev
```

`pnpm dev` opens the Electron window with hot reload for the renderer and main
process. The renderer talks to the main process only through the typed preload
bridge in `apps/desktop/src/preload`.

## Package

```sh
pnpm package
pnpm package:win
pnpm package:mac
pnpm package:linux
```

Artifacts are written to `apps/desktop/dist`.

## Lint and format

```sh
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

`pnpm lint` runs Oxlint and Oxfmt across the workspace. `pnpm format` rewrites
files with Oxfmt; use `pnpm format:check` in CI.

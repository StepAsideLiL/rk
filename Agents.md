# rk

rk is a TypeScript monorepo managed with pnpm and Turborepo. Packages live in `apps/*` and `packages/*`. Oxc handles linting and formatting, configured in the root `oxlint.config.ts` and `oxfmt.config.ts`; shared TypeScript settings live in `tsconfig.base.json`, while the root `tsconfig.json` only typechecks the Oxc config files. Each package carries its own `lint`, `lint:fix`, and `typecheck` scripts, which Turborepo runs. The root `lint:root` and `typecheck:root` scripts are registered as Turbo root tasks and cover the repo-root configs.

## Commands

| Command             | What it does                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| `pnpm build`        | Build all packages (via Turborepo)                                                  |
| `pnpm dev`          | Run dev tasks (via Turborepo)                                                       |
| `pnpm format`       | Format the repo with Oxfmt                                                          |
| `pnpm format:check` | Check formatting with Oxfmt                                                         |
| `pnpm lint`         | Fix package lint/formatting, then check packages and root configs with Oxlint/Oxfmt |
| `pnpm lint:fix`     | Apply Oxlint fixes                                                                  |
| `pnpm package`      | Package the desktop app with electron-builder                                       |
| `pnpm test`         | Run the test suites of all packages (via Turborepo)                                 |
| `pnpm typecheck`    | Typecheck all packages and root configs with tsc (via Turborepo)                    |
| `pnpm playground`   | Run the playground app (Vite dev server)                                            |
| `pnpm check`        | Run lint, root lint, typecheck, root typecheck, test and build (via Turborepo)      |

Run a single command in one package with `pnpm exec turbo run <task> --filter=<package>`.

## Desktop app

`apps/desktop` (`@rk/desktop`) is an Electron app built with electron-vite, React, TypeScript, and Tailwind CSS v4. The main process lives in `src/main`, the typed `contextBridge` API in `src/preload`, and the React renderer in `src/renderer`. IPC channel names and payload types are shared through `src/shared/ipc-channels.ts`.

Keep `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. The preload builds as CommonJS (the package has no `"type": "module"`) so sandboxed preloads can load it. `@renderer/*` and `@shared/*` aliases are configured in TypeScript and electron-vite.

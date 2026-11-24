# rk

rk is a TypeScript monorepo managed with pnpm and Turborepo. Packages live in `apps/*` and `packages/*`. Oxc handles linting and formatting, configured in the root `oxlint.config.ts` and `oxfmt.config.ts`; shared TypeScript settings live in `tsconfig.base.json`, while the root `tsconfig.json` only typechecks the Oxc config files. Each package carries its own `lint`, `lint:fix`, and `typecheck` scripts, which Turborepo runs. The root `lint:root` and `typecheck:root` scripts are registered as Turbo root tasks and cover the repo-root configs.

## Commands

| Command           | What it does                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| `pnpm build`      | Build all packages (via Turborepo)                                                  |
| `pnpm dev`        | Run dev tasks (via Turborepo)                                                       |
| `pnpm lint`       | Fix package lint/formatting, then check packages and root configs with Oxlint/Oxfmt |
| `pnpm test`       | Run the test suites of all packages (via Turborepo)                                 |
| `pnpm typecheck`  | Typecheck all packages and root configs with tsc (via Turborepo)                    |
| `pnpm playground` | Run the playground app (Vite dev server)                                            |
| `pnpm check`      | Run lint, root lint, typecheck, root typecheck, test and build (via Turborepo)      |

Run a single command in one package with `pnpm exec turbo run <task> --filter=<package>`.

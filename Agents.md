# rk

rk is a TypeScript monorepo managed with pnpm and Turborepo. Packages live in `apps/*` and `packages/*`. Oxc handles linting and formatting, configured in the root `oxlint.config.ts` and `oxfmt.config.ts`; shared TypeScript settings live in the root `tsconfig.json`. Each package carries its own `lint`, `lint:fix`, and `typecheck` scripts, which Turborepo runs.

## Commands

| Command           | What it does                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| `pnpm lint`       | Fix lint and formatting, then lint with Oxlint and check formatting with Oxfmt |
| `pnpm lint:fix`   | Auto-fix lint issues with Oxlint and format files with Oxfmt                   |
| `pnpm typecheck`  | Typecheck all packages with tsc (via Turborepo)                                |
| `pnpm playground` | Run the playground app (Vite dev server)                                       |
| `pnpm build`      | Build all packages (via Turborepo)                                             |
| `pnpm dev`        | Run dev tasks (via Turborepo)                                                  |

Run a single command in one package with `pnpm exec turbo run <task> --filter=<package>`.

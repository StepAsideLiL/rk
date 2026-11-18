# rk

rk is a TypeScript monorepo managed with pnpm and Turborepo. Packages live in `apps/*` and `packages/*`. Oxc handles linting and formatting; shared TypeScript settings live in the root `tsconfig.json`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm lint` | Fix lint and formatting, then lint with Oxlint and check formatting with Oxfmt |
| `pnpm lint:fix` | Auto-fix lint issues with Oxlint and format files with Oxfmt |
| `pnpm typecheck` | Typecheck with `tsc --noEmit` |
| `pnpm build` | Build all packages (via Turborepo) |
| `pnpm dev` | Run dev tasks (via Turborepo) |

Run a single command in one package with `pnpm exec turbo run <task> --filter=<package>`.

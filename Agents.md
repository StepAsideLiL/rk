# rk

rk is a TypeScript monorepo managed with pnpm and Turborepo. Apps live in
`apps/*` and packages live in `packages/*`. Oxc handles linting and formatting
through the root `oxlint.config.ts` and `oxfmt.config.ts`, while shared
TypeScript settings live in `tsconfig.base.json`. Shared dependency versions
come from the pnpm catalog in `pnpm-workspace.yaml`.

## Setup

- Requirements: Node `>=22` and the pnpm version pinned in `packageManager`.
  Install with `pnpm install`.
- pnpm 12 reads native build-script approvals from `allowBuilds` in
  `pnpm-workspace.yaml` (the replacement for `pnpm.onlyBuiltDependencies`).
  `nodeLinker` is `hoisted`, also configured there.
- Run workspace commands from the repo root. Use a package filter for
  package-specific work, for example
  `pnpm exec turbo run test typecheck lint build --filter=<package>`.
- Shared dependency versions are declared once in the workspace `catalog`.
  Reference them with `"catalog:"`; never pin or duplicate shared versions in a
  package.
- Each app and package has its own `AGENTS.md` with its scripts, layout, and
  rules. Read the nearest one before changing that workspace. Its local rules
  take precedence over this file.
- Creating a new app or package requires following
  `docs/create-new-package.md`, including an `AGENTS.md`, `README.md`, Oxc
  configs, `tsconfig.json`, and package scripts.

## Layout

- `apps/*` — applications and user-facing entry points. Each app documents its
  own setup and directory layout in its `AGENTS.md`.
- `packages/*` — shared libraries and workspace packages. Each package
  documents its own build model, exports, and layout in its `AGENTS.md`.
- `docs/*` — repository-wide instructions for agents and maintainers.
- Root configs — `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and the
  Oxc configs define workspace-wide behavior. `tsconfig.base.json` holds shared
  TypeScript settings, while the root `tsconfig.json` only typechecks the Oxc
  config files.

## Rules

- Do not manually edit root files, except the `catalog` field in
  `pnpm-workspace.yaml`. Generated changes such as `pnpm-lock.yaml` updates and
  formatter/linter output are expected.
- Do not add dependencies to root `package.json`.
- Do not add scripts to root `package.json`.
- Do not change other root configurations for a single package's needs. Extend
  or override them in the package instead.
- Keep package boundaries one-way: apps may depend on packages, but packages
  must not import apps. Do not reach into another package's internals; use its
  public exports.
- Follow the owning package's build model. Read its `AGENTS.md` before importing
  its output or relying on a build step.
- Put new shared dependencies in the workspace `catalog`, then reference them
  from the package that needs them.
- Keep TypeScript strict. Do not add `any` without a comment explaining why,
  and do not weaken `tsconfig.base.json`.
- Oxlint and Oxfmt are the source of truth. Do not hand-format files or disable
  rules without a documented reason.
- Add or update tests for behavior changes, and run the narrowest relevant
  filtered task while iterating. Run `pnpm check` before finishing changes that
  cross package boundaries.
- Update the affected package's `AGENTS.md` when its layout, scripts, or
  conventions change.

## Commands, building and checking

| Command               | What it does                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm build`          | Build all packages (via Turborepo)                               |
| `pnpm dev`            | Run all dev tasks (via Turborepo)                                |
| `pnpm lint`           | Run package lint/format fixes, then the root Oxlint/Oxfmt pass   |
| `pnpm lint:root`      | Run the root Oxlint/Oxfmt fix-and-check pass                     |
| `pnpm test`           | Run the test suites of all packages (via Turborepo)              |
| `pnpm typecheck`      | Typecheck all packages and root configs with tsc (via Turborepo) |
| `pnpm typecheck:root` | Typecheck only the root configs with tsc                         |
| `pnpm playground`     | Run the playground dev server                                    |
| `pnpm check`          | Run lint, typecheck, test and build (via Turborepo)              |

Run a single command in one package with
`pnpm exec turbo run <task> --filter=<package>`.

Package-specific scripts are not root scripts. Run them with
`pnpm --filter <package> <script>`, and read that package's `AGENTS.md` for its
available commands. Root has no `format`, `format:check`, or `lint:fix` scripts;
use `pnpm lint` and `pnpm lint:root` instead.

## Documents (`docs/*`)

- `create-new-package.md`: Rules to follow while creating a new app or package.

# @rk/ui

UI components and behaviors for rk, built on ui-sdk (`@ui-sdk/core` plus one
adapter package per framework). Source is consumed directly by the workspace's
Vite apps; there is no build step.

## Setup

- Package: `@rk/ui` (`packages/ui`), pnpm + Turborepo.
- Run commands from the repo root with the package filter, for example
  `pnpm --filter @rk/ui test`.
- Local scripts: `lint`, `lint:fix`, `test`, `typecheck`. There is no `build`
  script.
- Entries: `@rk/ui` exports the framework-free primitives; `@rk/ui/react`
  exports the React parts.
- Before using ui-sdk, follow the ui-sdk skill if it is installed.
- Read `node_modules/@ui-sdk/react/docs/llms.txt` to see what is available.
- To build a new component, also search
  `node_modules/@ui-sdk/react/docs/core.md` by heading, and read
  `node_modules/@ui-sdk/react/docs/rendering.md` next to it.
- Shared dependency versions come from the workspace `catalog` in
  `pnpm-workspace.yaml`; never pin shared versions here.
- See the repository root `AGENTS.md` for workspace-wide rules.

## Layout

- `src/primitive/<name>.ts` — the framework-free primitive: state, changes,
  parts, and ARIA. No React, no DOM.
- `src/primitive/primitives.test.ts` — Vitest coverage for primitive state and
  part attributes.
- `src/react/<name>.tsx` — the React rendering of a primitive via `createParts`;
  every file starts with `"use client"`.
- `src/react/index.ts` — React part exports.
- `src/index.ts` — primitive exports.
- `README.md`, `vitest.config.ts`, and `tsconfig.json` — package introduction,
  test setup, and typechecking.

## Rules

- Follow the ui-sdk skill and the docs listed in Setup before implementing or
  changing a component.
- Keep primitives framework-free: no React imports, no DOM access, and no
  styling. Each framework renders them from its own folder.
- React parts must come from `createParts` in `src/react/<name>.tsx` and
  re-export from `src/react/index.ts`. Primitives re-export from `src/index.ts`.
- To support another frontend library, add `src/<framework>/`, a
  `./<framework>` export, and the matching `@ui-sdk/<framework>` adapter
  package. The primitives do not change.
- Primitives report changes through `createChange` and declare
  `agent: { actions }`; the app controls values with `<key>` / `on<Key>Change`.
- Components render no styles; style parts from `data-slot` and state
  attributes. Apps declare `@layer ui-sdk;` at the top of their global
  stylesheet.
- Keep this package source-only. Do not add a build step unless the consumption
  model changes.
- Add or update Vitest coverage for primitive state, part attributes, and
  controlled behavior.
- Keep TypeScript strict; no `any` without a comment explaining why.

## Building and checking

- `pnpm --filter @rk/ui test` runs the primitive test suite.
- `pnpm --filter @rk/ui typecheck` checks the package with tsc.
- `pnpm --filter @rk/ui lint` applies Oxlint/Oxfmt fixes, then checks the
  package.
- There is no build script; verify React integrations through the playground
  pages at `/ui/react/*`.
- Run `pnpm check` from the repo root for cross-package changes.

## Documents

- No package-specific documents. Workspace guidance lives in the root
  `AGENTS.md` and `docs/`.

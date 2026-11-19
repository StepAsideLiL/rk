# @rk/editor

Extensible ProseMirror editor with mdast as the interchange format. Features are
declarative extensions; markdown conversion is registry based.

## Setup

- Package: `@rk/editor` (`packages/editor`), pnpm + Turborepo.
- Source-only workspace patterns do not apply: this package builds to `dist/`.
- Run everything from the repo root with the package filter, for example
  `pnpm turbo run test typecheck lint build --filter=@rk/editor`.
- Local scripts: `build`, `dev` (playground on port 5174), `test`,
  `test:watch`, `typecheck`, `lint`, `coverage`, `bench`, `smoke`.

## Layout

- `src/core` — types, `defineExtension`, `ExtensionManager`, `createEditor`,
  core markdown interfaces. No DOM, no imports from sibling folders.
- `src/markdown` — unified pipeline, mdast ↔ ProseMirror conversion, shared mark
  helpers. No DOM.
- `src/extensions` — one folder per feature, plus `shared/` helpers and
  `starterKit()`.
- `src/react` — provider, hooks, `EditorContent`, `createReactNodeView`.
- `src/testing` — `createTestEditor`, `roundTrip`, `docOf`, `textOf`, `press`,
  `typeText`.
- `playground/` — local Vite app, not published.
- `docs/` — extension guide, contract reference, cookbook, testing guide.

## Rules

- mdast is the exchange format. Markdown ↔ mdast uses unified; mdast ↔
  ProseMirror uses the registry, never `prosemirror-markdown`.
- Extensions contribute schema, plugins, keymap, commands, input rules,
  NodeViews and markdown handlers. `requires` lists **extension names**.
- Extension state lives in a ProseMirror plugin keyed with `PluginKey`, never in
  module variables or React state.
- Commands are pure `(state, dispatch?, view?) => boolean`. Dispatch
  transactions; never mutate the DOM or view directly. Use decorations for
  visual-only UI.
- Plugin views and NodeViews must clean up listeners, observers, timers and
  React roots in `destroy()`.
- TypeScript strict; no `any` without a comment. Prefer factories and plain
  objects.
- Every extension ships with Vitest tests: round trips, `doc.check()`, commands,
  input rules and keymaps. NodeView tests use `*.dom.test.ts`.
- Keep dependency direction: core → nothing internal, markdown → core, react →
  core, extensions → core. oxlint enforces imports and DOM-free core/markdown.

## Building and checking

- `pnpm build` emits ESM plus per-entry `.d.ts`; dependencies stay external.
- `pnpm test` runs the node and jsdom Vitest projects.
- `pnpm coverage` covers `src/core` and `src/markdown` with v8.
- `pnpm smoke` imports every built subpath from `dist` and round-trips markdown.
- `pnpm pack --dry-run` includes only `dist/**`, `package.json` and `README.md`.

## Creating a new extension

Add the <NAME> extension under src/extensions/<name> following the same contract and conventions as existing extensions.

Include: schema, remark plugin(s) if needed (remark-gfm for tables/tasks, remark-directive for callouts), fromMdast/toMdast, commands with typed Commands augmentation, keymap, input rules, NodeView/plugin view if needed (destroy cleanup), state in a PluginKey, playground toolbar entry, and export from src/extensions/index.ts.

Write the failing tests FIRST (round trips incl. nesting, empty, unicode, and the exact edge cases for this feature), confirm they fail, then implement.

Vitest:

- round-trip table via it.each, doc.check(), command tests (no DOM)
- NodeViews in *.dom.test.ts: mounts, updates on attr change, destroy removes listeners
- one test that an editor WITHOUT this extension reports the unknown-node strategy error for its markdown

Do not modify src/core. If you believe core must change, stop and explain why first.

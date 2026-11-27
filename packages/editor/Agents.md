# @rk/editor

Extensible ProseMirror editor with markdown and sanitized HTML codecs. Features
are declarative extensions; markdown conversion is registry based and HTML uses
each extension's `parseDOM`/`toDOM` specs.

## Setup

- Package: `@rk/editor` (`packages/editor`), pnpm + Turborepo.
- This package builds to `dist/`; it is not a source-only workspace package.
  Consumers import the published entry points.
- Run commands from the repo root with the package filter, for example
  `pnpm --filter @rk/editor build` or
  `pnpm exec turbo run test typecheck lint build --filter=@rk/editor`.
- Local scripts: `build`, `test`, `test:watch`, `typecheck`, `lint`, `coverage`,
  `bench`, `smoke`.
- The interactive editor demo lives in the playground app at `/editor`
  (`pnpm playground` from the repo root).
- Shared dependency versions come from the workspace `catalog` in
  `pnpm-workspace.yaml`; never pin shared versions here.
- See the repository root `AGENTS.md` for workspace-wide rules.

## Layout

- `src/core` — types, `defineExtension`, `ExtensionManager`, flattening helpers
  and content codec contracts. No DOM, no imports from sibling folders.
- `src/markdown` — unified pipeline, mdast ↔ ProseMirror conversion, shared mark
  helpers. No DOM.
- `src/html` — sanitized rehype pipeline, DOM parsing/serialization and
  sanitizer schema merging. No imports outside core.
- `src/extensions` — one folder per feature, plus `shared/` helpers, the
  `StarterKit()` default bundle and the `PlaygroundKit()` playground bundle.
- `src/editor.ts` — the `Editor` class with default markdown, HTML and JSON
  codecs.
- `src/react` — `EditorRoot`, `useEditor`, hooks, `EditorContent` and
  `createReactNodeView`.
- `src/testing` — `createTestEditor`, `roundTrip`, `docOf`, `textOf`, `press`,
  `typeText`.
- `src/index.ts` — the public assembly point and root exports; nothing inside
  the package imports it.
- `scripts/smoke-dist.mjs` — smoke test for the built subpaths.
- `vite.config.ts` and `vitest.config.ts` — library build and test setup.

## Rules

- mdast is the markdown exchange format. Markdown ↔ mdast uses unified; mdast ↔
  ProseMirror uses the registry, never `prosemirror-markdown`.
- HTML never goes through mdast. Parse/serialize with `rehype` plus
  ProseMirror's `DOMParser`/`DOMSerializer`; always sanitize before parsing and
  again before returning output.
- Extensions contribute schema, plugins, keymap, commands, input rules,
  NodeViews, markdown handlers and HTML sanitizer allowlists. `requires` lists
  **extension names**. Do not write per-extension HTML handlers.
- Every rendered element must be included in the extension's `html.sanitize`
  allowlist. The HTML consistency test fails when an allowlist is missing.
- Extension state lives in a ProseMirror plugin keyed with `PluginKey`, never in
  module variables or React state.
- Commands are pure `(state, dispatch?, view?) => boolean`. Dispatch
  transactions; never mutate the DOM or view directly. Use decorations for
  visual-only UI.
- Plugin views and NodeViews must clean up listeners, observers, timers and
  React roots in `destroy()`.
- TypeScript strict; no `any` without a comment. Prefer classes for stateful
  collaborators (`Editor`, `ExtensionManager`, codecs) and plain objects or
  identity factories for declarative extensions.
- Every extension ships with Vitest tests: round trips, `doc.check()`, commands,
  input rules and keymaps. NodeView tests use `*.dom.test.ts`.
- Keep dependency direction: core → nothing internal, markdown → core, html →
  core, extensions → core, react → the public editor class. Oxlint enforces
  imports and DOM-free core/markdown.
- Keep exports one-way: import concrete modules, never a barrel that re-exports
  the importer. `src/index.ts` is the root assembly point; nothing inside the
  package imports it.
- Extend or override root configs in this package. Do not edit root configs for
  package-specific needs.
- Use workspace `catalog:` versions for shared dependencies; never pin shared
  versions here.

## Building and checking

- `pnpm --filter @rk/editor build` emits ESM plus per-entry `.d.ts`; dependencies
  stay external.
- `pnpm --filter @rk/editor test` runs the node and jsdom Vitest projects. HTML
  tests inject a `linkedom` document in the node project.
- `pnpm --filter @rk/editor test:watch` runs Vitest in watch mode.
- `pnpm --filter @rk/editor coverage` covers `src/editor.ts`, `src/core`,
  `src/markdown` and `src/html` with v8.
- `pnpm --filter @rk/editor bench` runs the markdown benchmarks.
- `pnpm --filter @rk/editor smoke` imports every built subpath from `dist`,
  including `@rk/editor/html`, and round-trips markdown.
- `pnpm --filter @rk/editor typecheck` and
  `pnpm --filter @rk/editor lint` check types, imports, and formatting.
- From `packages/editor`, `pnpm pack --dry-run` includes only `dist/**`,
  `package.json` and `README.md`.
- Run `pnpm check` from the repo root for cross-package changes.

## Creating a new extension

Add the `<NAME>` extension under `src/extensions/<name>` following the same
contract and conventions as existing extensions. Read
`docs/create-new-extension.md` for the checklist.

Include: schema, remark plugin(s) and their dependencies if needed (for example
`remark-gfm` for tables/tasks or `remark-directive` for callouts),
fromMdast/toMdast, commands with typed Commands augmentation, keymap, input
rules, NodeView/plugin view if needed (destroy cleanup), state in a PluginKey,
an HTML sanitizer allowlist matching `parseDOM`/`toDOM`, a toolbar entry on the
`apps/playground` editor page, and export from `src/extensions/index.ts`.

Write the failing tests first (round trips including nesting, empty, unicode,
and the exact edge cases for this feature), confirm they fail, then implement.

Vitest:

- markdown round-trip table via `it.each`, `doc.check()`, command tests (no DOM)
- HTML round trips with an injected `linkedom` document and `doc.check()`
- XSS cases for every new element or attribute the extension allows
- NodeViews in `*.dom.test.ts`: mounts, updates on attribute change, destroy
  removes listeners
- one test that an editor without this extension reports the unknown-node
  strategy error for its markdown

Keep core changes additive. New codec contracts and content types may extend
`src/core`; never move DOM access or codec implementations into it. Stop and
explain if a task seems to require more than that.

## Documents

- `docs/README.md` — index of the package documentation.
- `docs/first-extension.md` — end-to-end walkthrough for a first extension.
- `docs/extension-contract.md` — extension fields, command types, markdown
  handlers and boundary rules.
- `docs/cookbook.md` — NodeViews, plugin state, decorations and transaction-meta
  patterns.
- `docs/html.md` — sanitized HTML parsing, serialization, allowlists and the
  markdown-lossy versus HTML-lossless boundary.
- `docs/testing.md` — headless helpers, DOM tests and property tests.
- `docs/create-new-extension.md` — rules and test checklist for new extensions.

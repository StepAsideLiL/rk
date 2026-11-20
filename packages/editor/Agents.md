# @rk/editor

Extensible ProseMirror editor with markdown and sanitized HTML codecs. Features
are declarative extensions; markdown conversion is registry based and HTML uses
each extension's `parseDOM`/`toDOM` specs.

## Setup

- Package: `@rk/editor` (`packages/editor`), pnpm + Turborepo.
- Source-only workspace patterns do not apply: this package builds to `dist/`.
- Run everything from the repo root with the package filter, for example
  `pnpm turbo run test typecheck lint build --filter=@rk/editor`.
- Local scripts: `build`, `test`, `test:watch`, `typecheck`, `lint`,
  `coverage`, `bench`, `smoke`.
- The interactive editor demo lives in the workspace playground app at
  `/editor` (`apps/playground`).

## Layout

- `src/core` — types, `defineExtension`, `ExtensionManager`, the codec-injected
  editor factory and content codec contracts. No DOM, no imports from sibling
  folders.
- `src/markdown` — unified pipeline, mdast ↔ ProseMirror conversion, shared mark
  helpers. No DOM.
- `src/html` — sanitized rehype pipeline, DOM parsing/serialization and
  sanitizer schema merging. No imports outside core.
- `src/extensions` — one folder per feature, plus `shared/` helpers and
  `starterKit()`.
- `src/editor.ts` — public `createEditor` wrapper that assembles the markdown,
  HTML and JSON codecs.
- `src/react` — provider, hooks, `EditorContent`, `createReactNodeView`.
- `src/testing` — `createTestEditor`, `roundTrip`, `docOf`, `textOf`, `press`,
  `typeText`.
- `docs/` — extension guide, contract reference, cookbook, HTML codec guide,
  testing guide.

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
- TypeScript strict; no `any` without a comment. Prefer factories and plain
  objects.
- Every extension ships with Vitest tests: round trips, `doc.check()`, commands,
  input rules and keymaps. NodeView tests use `*.dom.test.ts`.
- Keep dependency direction: core → nothing internal, markdown → core, html →
  core, extensions → core, react → the public editor wrapper. oxlint enforces
  imports and DOM-free core/markdown.

## Building and checking

- `pnpm build` emits ESM plus per-entry `.d.ts`; dependencies stay external.
- `pnpm test` runs the node and jsdom Vitest projects. HTML tests inject a
  `linkedom` document in the node project.
- `pnpm coverage` covers `src/core`, `src/markdown` and `src/html` with v8.
- `pnpm smoke` imports every built subpath from `dist`, including
  `@rk/editor/html`, and round-trips markdown.
- `pnpm pack --dry-run` includes only `dist/**`, `package.json` and `README.md`.

## Creating a new extension

Add the <NAME> extension under src/extensions/<name> following the same contract and conventions as existing extensions.

Include: schema, remark plugin(s) if needed (remark-gfm for tables/tasks, remark-directive for callouts), fromMdast/toMdast, commands with typed Commands augmentation, keymap, input rules, NodeView/plugin view if needed (destroy cleanup), state in a PluginKey, an HTML sanitizer allowlist matching `parseDOM`/`toDOM`, a toolbar entry on the `apps/playground` editor page, and export from src/extensions/index.ts.

Write the failing tests FIRST (round trips incl. nesting, empty, unicode, and the exact edge cases for this feature), confirm they fail, then implement.

Vitest:

- markdown round-trip table via it.each, doc.check(), command tests (no DOM)
- HTML round trips with an injected `linkedom` document and `doc.check()`
- XSS cases for every new element or attribute the extension allows
- NodeViews in *.dom.test.ts: mounts, updates on attr change, destroy removes listeners
- one test that an editor WITHOUT this extension reports the unknown-node strategy error for its markdown

Keep core changes additive. New codec contracts and content types may extend
`src/core`; never move DOM access or codec implementations into it. Stop and
explain if a task seems to require more than that.

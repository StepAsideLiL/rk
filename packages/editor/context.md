build an extensible rich text editor in `packages/editor`.

Target layout

```
packages/editor/
  package.json
  tsconfig.json            # extends the monorepo base
  vite.config.ts           # library build
  vitest.config.ts         # projects: node + jsdom
  oxlint.config.ts         # boundary rules
  src/
    core/                  # types, ExtensionManager, createEditor
    markdown/              # unified pipeline, mark helpers
    extensions/            # one folder per feature
      document/ paragraph/ text/ heading/ bold/ italic/ ...
    react/                 # provider, hooks, NodeView helper
    testing/               # createTestEditor, roundTrip (exported)
    index.ts               # re-exports core + markdown
  playground/              # optional Vite dev app, not published
```

Dependency direction (lint-enforced): extensions → core, markdown → core, react → core, and core imports nothing from the othe

Monorepo rules:

- Do not modify other packages or root configs except where a prompt explicitly says so (turbo.json task entries, pnpm-workspace if needed). Reuse the root's shared tsconfig/eslint/prettier configs by extending them.
- Use `workspace:*` for internal deps and the repo's existing dependency versions/catalog where one exists.
- Every script (build, test, lint, typecheck, dev) must be runnable via turbo from the root, e.g. `pnpm turbo run test --filter=@your-scope/editor`.

Architecture rules (never violate):

- mdast is the interchange format. Markdown <-> mdast via unified; mdast <-> ProseMirror via registry-based handlers (NOT prosemirror-markdown's hardcoded tables).
- Every feature is an Extension: one declarative object contributing schema (nodes/marks), plugins, keymap, commands, nodeViews, input rules, and markdown handlers.
- Folder dependency direction: extensions/ -> core/, markdown/ -> core/, react/ -> core/. core/ must never import from extensions/, markdown/ or react/. Enforced by ESLint no-restricted-imports.
- Commands are pure (state, dispatch?, view?) => boolean.
- Extension state lives in ProseMirror plugin state (PluginKey), never module variables or React state.
- Never mutate the DOM/view directly; dispatch transactions. Use decorations for visual-only UI.
- Plugin views and NodeViews clean up in destroy().
- TypeScript strict, no `any` without a comment. Prefer factories and plain objects over classes.
- Every extension ships with Vitest tests (markdown round-trip, schema validity, commands).
- core/ and markdown/ must not touch the DOM so they run in the node test environment.

Work in small steps, run `pnpm turbo run test typecheck lint --filter=@your-scope/editor` after each, and tell me what you changed and why.

Mismatch Alart (important):
If something in prompt does not match with the currect setup of the project, report back with relevent information.

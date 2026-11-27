# Create new extension

This doc outlines the rules to create a new `@rk/editor` extension in `packages/editor/src/extensions`.

## Rules

- Add the <NAME> extension under src/extensions/<name> following the same contract and conventions as existing extensions.

- Include: schema, remark plugin(s) and their dependencies if needed (for example `remark-gfm` for tables/tasks or `remark-directive` for callouts), fromMdast/toMdast, commands with typed Commands augmentation, keymap, input rules, NodeView/plugin view if needed (destroy cleanup), state in a PluginKey, an HTML sanitizer allowlist matching `parseDOM`/`toDOM`, a toolbar entry on the `apps/playground` editor page, and export from src/extensions/index.ts.

- Write the failing tests FIRST (round trips incl. nesting, empty, unicode, and the exact edge cases for this feature), confirm they fail, then implement.

Vitest:

- markdown round-trip table via it.each, doc.check(), command tests (no DOM)
- HTML round trips with an injected `linkedom` document and `doc.check()`
- XSS cases for every new element or attribute the extension allows
- NodeViews in *.dom.test.ts: mounts, updates on attr change, destroy removes listeners
- one test that an editor WITHOUT this extension reports the unknown-node strategy error for its markdown

Keep core changes additive. New codec contracts and content types may extend
`src/core`; never move DOM access or codec implementations into it. Stop and
explain if a task seems to require more than that.

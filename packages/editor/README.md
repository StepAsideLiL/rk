# @rk/editor

Extensible rich text editor for rk. mdast is the interchange format; features are
declarative extensions over ProseMirror.

## Layout

| Path              | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `src/core/`       | Types, `ExtensionManager` and codec-injected `EditorCore`. DOM-free. |
| `src/markdown/`   | unified pipeline and mdast <-> ProseMirror handlers.                 |
| `src/html/`       | Sanitized rehype pipeline and HTML codec.                            |
| `src/extensions/` | One folder per feature.                                              |
| `src/react/`      | React provider, hooks and NodeView helper.                           |
| `src/testing/`    | Test helpers, exported as `@rk/editor/testing`.                      |

## Scripts

```sh
pnpm build      # library build into dist/
pnpm test       # Vitest projects: node + dom
pnpm typecheck
pnpm lint
```

Consumers use `@rk/editor`, `@rk/editor/react`, `@rk/editor/extensions`,
`@rk/editor/html` and `@rk/editor/testing`. The `Editor` class wires the markdown,
HTML and JSON codecs by default. The interactive demo runs in the workspace
playground at `/editor` (`pnpm playground` from the repo root).

## Inactive selection

`starterKit()` includes `Selection()`. When the editor loses focus, the last
text selection stays visible with a dim gray background instead of disappearing.
Theme it with the `--rk-selection-inactive-bg` custom property, or add
`Selection()` to a custom extension set.

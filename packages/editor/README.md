# @rk/editor

Extensible rich text editor for rk. Markdown is the primary interchange format,
with HTML and JSON codecs also available; features are declarative extensions
over ProseMirror.

## Layout

| Path              | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `src/core/`       | Types, `ExtensionManager` and flattening helpers. DOM-free. |
| `src/editor.ts`   | `Editor` class with default markdown, HTML and JSON codecs. |
| `src/markdown/`   | unified pipeline and mdast <-> ProseMirror handlers.        |
| `src/html/`       | Sanitized rehype pipeline and HTML codec.                   |
| `src/extensions/` | One folder per feature.                                     |
| `src/react/`      | React provider, hooks and NodeView helper.                  |
| `src/testing/`    | Test helpers, exported as `@rk/editor/testing`.             |

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

## Editor API

`Editor` accepts `element`, `editable`, `textDirection`, `autofocus`,
`editorProps`, `coreExtensionOptions.tabindex`, `enableInputRules` and
`schemaSpec` alongside `extensions` and `content`.

Runtime helpers include `setEditable`, `setOptions`, `mount`, `unmount`,
`registerPlugin`, `unregisterPlugin`, `chain`, `getText`, `getAttributes`,
`isActive`, `isEmpty`, `isFocused` and `isDestroyed`. Extensions and
`schemaSpec` are read at construction; `setOptions` updates runtime options
such as `editable`, `editorProps`, `textDirection` and `content`.

## Inactive selection

`StarterKit()` includes `Selection()`. When the editor loses focus, the last
text selection stays visible with a dim gray background instead of disappearing.
Theme it with the `--rk-selection-inactive-bg` custom property, or add
`Selection()` to a custom extension set.

# @rk/editor

Extensible rich text editor for rk. mdast is the interchange format; features are
declarative extensions over ProseMirror.

## Layout

| Path              | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `src/core/`       | Types, extension manager and editor factory. DOM-free. |
| `src/markdown/`   | unified pipeline and mdast <-> ProseMirror handlers.   |
| `src/extensions/` | One folder per feature.                                |
| `src/react/`      | React provider, hooks and NodeView helper.             |
| `src/testing/`    | Test helpers, exported as `@rk/editor/testing`.        |
| `playground/`     | Local Vite app, not published.                         |

## Scripts

```sh
pnpm dev        # playground on http://localhost:5174
pnpm build      # library build into dist/
pnpm test       # Vitest projects: node + dom
pnpm typecheck
pnpm lint
```

Consumers use `@rk/editor`, `@rk/editor/react`, `@rk/editor/extensions` and
`@rk/editor/testing`.

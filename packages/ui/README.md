# @rk/ui

UI components and behaviors for rk apps, built on top of [`ui-sdk`](https://ui-sdk.dev) (`@ui-sdk/core`).

- `@rk/ui/primitive` — the framework-free primitives: state, changes, parts, and ARIA
- `@rk/ui/react` — the React rendering of those primitives via `createParts`
- `@rk/ui/global.css` — the Tailwind and theme stylesheet

```tsx
import { ThemeToggleButton } from "@rk/ui/react";
import "@rk/ui/global.css";
```

Source is consumed directly (no build step) by Vite apps in this monorepo. Other frontend libraries (Vue, Svelte, Solid, web components) can be added later as new `src/<framework>/` adapters and `./<framework>` exports, without touching the primitives.

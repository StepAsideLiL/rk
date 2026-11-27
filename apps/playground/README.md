# @rk/playground

Playground app for testing, experimenting, and viewing UI in the rk monorepo. React + Vite + Tailwind CSS with a shadcn-style themable design.

## Run

```sh
pnpm --filter @rk/playground dev
```

## Routes

Routes are file-based under `src/routes/`, resolved by `@react-router/fs-routes`
from `src/routes.ts`. Dots in file names become URL path segments, and `_index`
marks an index route.

- `/` — lists the pages available in the playground (`_index.tsx`).
- `/editor` — interactive demo for `@rk/editor` with a Markdown/HTML input-format switcher and live output panels.
- `/ui/react` — index of the `@rk/ui/react` components.
- `/ui/react/button`, `/ui/react/dialog`, `/ui/react/h-column`, `/ui/react/sidebar` — component demos.

The app runs in React Router framework mode with SPA rendering (`ssr: false`),
configured in `react-router.config.ts`.

## Theme

- Default theme follows the system (`prefers-color-scheme`).
- Press `d` anywhere to toggle between light and dark.
- Theme tokens (colors, radius) live in `@rk/ui/global.css` (`packages/ui/src/style/global.css`) and are exposed as Tailwind utilities such as `bg-background` and `text-foreground`.

# @rk/playground

Playground app for testing, experimenting, and viewing UI in the rk monorepo. React + Vite + Tailwind CSS with a shadcn-style themable design.

## Run

```sh
pnpm --filter @rk/playground dev
```

## Pages

- `/` — lists the pages available in the playground.
- `/editor` — interactive demo for `@rk/editor` with Markdown/HTML input and output panels.

## Theme

- Default theme follows the system (`prefers-color-scheme`).
- Press `d` anywhere to toggle between light and dark.
- Theme tokens (colors, radius) live in `src/global.css` and are exposed as Tailwind utilities such as `bg-background` and `text-foreground`.

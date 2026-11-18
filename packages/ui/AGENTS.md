# @rk/ui

UI components and behaviors for rk, built on ui-sdk (`@ui-sdk/core` plus one adapter package per framework). Source is consumed directly by the monorepo's Vite apps; there is no build step.

- Before using ui-sdk, follow the ui-sdk skill if it's installed.
- Read `node_modules/@ui-sdk/react/docs/llms.txt` to see what's available.
- To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read `node_modules/@ui-sdk/react/docs/rendering.md` next to it.
- Layout: the framework-free primitive lives in `src/<name>/<name>.ts` — no React, no DOM. Each framework renders it from its own folder: React parts come from `createParts` in `src/react/<name>.tsx` (starts with `"use client"`) and re-export from `src/react/index.ts`. Primitives re-export from `src/index.ts`.
- Entries: `@rk/ui` exports primitives; `@rk/ui/react` exports the React parts. To support another frontend library, add `src/<framework>/`, a `./<framework>` export, and the matching `@ui-sdk/<framework>` adapter package — the primitives don't change.
- Primitives report changes through `createChange` and declare `agent: { actions }`; the app controls values with `<key>` / `on<Key>Change`.
- Components render no styles; style parts from `data-slot` and state attributes. Apps declare `@layer ui-sdk;` at the top of their global stylesheet.
- Shared dependency versions come from the workspace `catalog` in `pnpm-workspace.yaml` — never pin them here.

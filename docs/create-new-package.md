# Create a new app or package

This doc outlines the rules when creating a new app in `apps/` or package in
`packages/`.

## Rules

- Add an `AGENTS.md` file with relevant context about the app or package,
  following this template:

```md
# @rk/<name>

<<<brief introduction about the app or package>>>

## Setup

<<<app or package setup>>>

## Layout

<<<app or package directory layout>>>

## Rules

<<<rules the agents need to follow while editing the app or package>>>

## Building and checking

<<<how to build the app or package and how to check that it works>>>

## Documents

<<<if any, list the extra documents in `docs/` with a short description of what they cover and when to use them.>>>
```

- Create a `README.md` file with an introduction to the app or package.

- Create `oxfmt.config.ts` and `oxlint.config.ts` that reuse or extend the root
  configs, adding relevant rules. Oxfmt has no `extends` option, so reuse the
  root config object directly there.

- Create a `tsconfig.json` extending the root `tsconfig.base.json`.

- Add at least the following scripts to `package.json`:

```json
"scripts": {
  "lint": "pnpm run lint:fix && oxlint && oxfmt --check",
  "lint:fix": "oxlint --fix && oxfmt --write",
  "typecheck": "tsc --noEmit"
},
```

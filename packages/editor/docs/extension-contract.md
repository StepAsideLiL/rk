# Extension contract

An extension is one declarative object created with `defineExtension`. The
manager validates, sorts and merges contributions into a schema, plugin list,
command registry and markdown registry.

```ts
import { defineExtension, type Extension } from "@rk/editor";

export const Bold = defineExtension(() => ({
  name: "bold",
  priority: 40,
  requires: ["text"],
  marks: {
    strong: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM: () => ["strong", 0],
    },
  },
  commands: (context) => {
    const strong = context.schema.marks.strong;
    return strong ? { toggleBold: toggleMark(strong) } : {};
  },
}));
```

## `defineExtension`

```ts
export function defineExtension(factory: () => Extension): () => Extension;
export function defineExtension<Options>(
  factory: (options: Options) => Extension<Options>,
): (options: Options) => Extension<Options>;
```

The helper is identity at runtime. It exists so the options type survives. Call
option-less factories as `Bold()`; call configured ones as
`Heading({ levels: [1, 2, 3] })`.

## `Extension<Options>`

| Field        | Type                                   | Notes                                                                                |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `name`       | `string`                               | Unique. Used by `requires`.                                                          |
| `priority`   | `number`                               | Default `100`. Schema merges ascending; keymaps and input rules evaluate descending. |
| `requires`   | `readonly string[]`                    | **Extension names** (not node names) that must be installed.                         |
| `nodes`      | `Record<string, NodeSpec>`             | Schema nodes.                                                                        |
| `marks`      | `Record<string, MarkSpec>`             | Schema marks.                                                                        |
| `plugins`    | `(context) => readonly Plugin[]`       | ProseMirror plugins.                                                                 |
| `keymap`     | `(context) => Record<string, Command>` | One keymap plugin per priority tier.                                                 |
| `commands`   | `(context) => Partial<Commands>`       | Registered typed commands.                                                           |
| `nodeViews`  | `Record<string, NodeViewConstructor>`  | Must clean up in `destroy()`.                                                        |
| `inputRules` | `(context) => readonly InputRule[]`    | Typed markdown-style shortcuts.                                                      |
| `markdown`   | `MarkdownContributions`                | Parsing and serialization.                                                           |
| `html`       | `HtmlContributions`                    | HTML sanitizer allowlists.                                                           |
| `extensions` | `readonly Extension<unknown>[]`        | Bundles other extensions. A bundle declares only `name` and `extensions`.            |
| `options`    | `Options`                              | Type-level marker only; never set at runtime.                                        |

### Bundles

An extension that declares `extensions` groups other extensions so callers can
install them as one unit. The manager expands bundles recursively before
validating names and merging contributions:

```ts
export const StarterKit = defineExtension(() => ({
  name: "starter-kit",
  extensions: [Document(), Text(), Paragraph(), Heading({}), Bold(), Italic(), Selection()],
}));

new Editor({ extensions: [StarterKit()] });
```

`StarterKit()` is the default bundle and `PlaygroundKit()` is the full bundle used
by the playground. A bundle may only declare `name` and `extensions`; behavior
belongs to a bundled extension, and declaring it on the bundle throws.

### Priority

- Lower values merge **first** into the schema. Paragraph usually uses a lower
  number than heading, so paragraph is the default block.
- Higher values win keymap and input-rule conflicts. Within one tier, the
  earlier extension wins a keymap conflict.

### `requires`

Only extension names are checked; the manager throws if a dependency is
missing. Prefer exported helpers (`NODE_NAMES`, `getNodeType`, `MARK_NAMES`,
`getMarkType` from `@rk/editor/extensions`) over hard-coded schema names.

## `ExtensionContext`

```ts
interface ExtensionContext {
  readonly schema: Schema;
  getState(): EditorState;
  getView(): EditorView | undefined;
  readonly commands: CommandRegistry;
}
```

The context exists while the editor is assembled and for its lifetime.
`getState()` throws during setup because no state exists yet; `getView()` is
`undefined` before a view is mounted.

## Commands

```ts
type Command = (
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
  view?: EditorView,
) => boolean;
```

Commands are pure: inspect state, optionally dispatch, return whether the
command applied. Do not mutate state or the view.

Declare command names by augmenting `Commands`:

```ts
declare module "@rk/editor" {
  interface Commands {
    toggleBold: import("@rk/editor").Command;
  }
}
```

`editor.commands.toggleBold()` binds state and dispatch. `editor.can.toggleBold()`
passes `dispatch: undefined` and must never change state. Bound commands are
zero-argument in the current API.

## Keymap and input rules

- Key names follow ProseMirror (`"Mod-b"`, `"Mod-Alt-1"`, `"Mod-Shift-h"`).
- Keymaps are grouped by priority tier; one keymap plugin is created per tier.
- Input rules are `InputRule` instances from `prosemirror-inputrules`. They run
  before a typed character is inserted. Test them with `typeText(editor, "...")`
  from `@rk/editor/testing`.

## Plugins and state

All extension state belongs in a ProseMirror plugin, keyed with `PluginKey`.
Never keep state in module variables, React state, or DOM attributes.

```ts
const counterKey = new PluginKey<number>("counter");

const counterPlugin = new Plugin({
  key: counterKey,
  state: {
    init: () => 0,
    apply: (tr, value) => (tr.docChanged ? value + 1 : value),
  },
});
```

Plugin views and NodeViews must clean up listeners, observers, timers and React
roots in `destroy()`. Use decorations for visual-only UI; never mutate the DOM
or `EditorView` directly.

## Markdown contributions

```ts
interface MarkdownContributions {
  remarkPlugins?: readonly Plugin[];
  fromMdast?: Record<string, MdastHandler>;
  toMdast?: Record<string, PmHandler>;
  markFromMdast?: Record<string, MdastMarkHandler>;
  markToMdast?: Record<string, PmMarkHandler>;
}
```

- `remarkPlugins` are added to both the parse and stringify processors.
- `fromMdast` is keyed by **mdast node type**. Return a ProseMirror node, an
  array, or `null` to fall back to the unknown-node strategy. The `state` helper
  exposes `schema`, `block(nodes)`, `inline(nodes)`, `text(node)` and
  `withMarks(node, marks)`.
- `toMdast` is keyed by **ProseMirror node type**. Return mdast content or
  `null` to fall back.
- `markFromMdast` is keyed by **mdast mark node type**; it returns a
  ProseMirror `Mark` or `null`.
- `markToMdast` is keyed by **ProseMirror mark name**; it receives the mark and
  serialized children and returns the mdast wrapper.

Built-in marks (`strong`, `emphasis`, `code`, `link`) do not need handlers.
Custom marks do. The serializer nests built-ins as
`link > strong > emphasis > code`, then custom marks in registration order.

## HTML contributions

The HTML codec does not use per-extension handlers. It reuses each node and
mark's `parseDOM`/`toDOM` and only needs sanitizer allowlist data:

```ts
html: {
  sanitize: {
    tagNames: ["mark"],
    attributes: { mark: ["className"] },
    protocols: {},
  },
},
```

See [the HTML codec guide](./html.md) for the default-deny schema, protocol
rules and the consistency test that catches missing allowlists.

### Unknown-node strategy

`new MarkdownCodec({ extensions, unknownNode })` supports `"throw"`,
`"drop"` and `"preserve"`. The default is `"throw"` during development and
`"preserve"` in production builds.

### Stringify options

`new MarkdownCodec({ extensions, stringify })` forwards options to
`remark-stringify`, for example:

```ts
new MarkdownCodec({
  extensions,
  stringify: { bullet: "-", emphasis: "*", listItemIndent: "one" },
});
```

## Wiring

The `Editor` class assembles the markdown, HTML and JSON codecs from the
extensions by default. Core stays codec-free; override individual codecs through
`codecs`, or replace only markdown with the legacy `markdown` option. React uses
the same defaults through `useEditor` and `<EditorRoot editor />`.

```ts
const extensions = [StarterKit()];
const editor = new Editor({
  extensions,
  content: "# Hi",
  contentType: "markdown",
});

editor.setContent("**updated**", "markdown");
editor.getMarkdown();

editor.setContent("<p><strong>updated</strong></p>", "html");
editor.getHTML();
editor.getJSON();
```

## Package boundaries

| Folder           | May import from                        |
| ---------------- | -------------------------------------- |
| `src/core`       | external packages only                 |
| `src/markdown`   | `src/core`                             |
| `src/html`       | `src/core`                             |
| `src/editor.ts`  | `src/core`, `src/markdown`, `src/html` |
| `src/react`      | `src/editor.ts`                        |
| `src/extensions` | `src/core`, shared extension helpers   |

Tests may import their subject and testing helpers. oxlint enforces
`no-restricted-imports`; violations fail `pnpm lint`.

# Cookbook

Short, complete patterns for the things extensions most often need.

## Custom block with a NodeView

A callout block has an attribute, editable content and a small DOM control.

```ts
import { defineExtension } from "@rk/editor";

export const Callout = defineExtension(() => ({
  name: "callout",
  requires: ["paragraph"],
  nodes: {
    callout: {
      group: "block",
      content: "block+",
      defining: true,
      attrs: { tone: { default: "info" } },
      parseDOM: [{ tag: "aside.callout" }],
      toDOM: (node) => ["aside", { class: `callout callout-${node.attrs.tone}` }, 0],
    },
  },
  nodeViews: {
    callout(node, view, getPos) {
      const dom = document.createElement("aside");
      const contentDOM = document.createElement("div");
      const select = document.createElement("select");

      for (const tone of ["info", "warning", "danger"]) {
        const option = document.createElement("option");
        option.value = tone;
        option.textContent = tone;
        select.append(option);
      }

      const sync = () => {
        dom.className = `callout callout-${node.attrs.tone}`;
        select.value = node.attrs.tone;
      };

      const onChange = () => {
        const pos = getPos();
        if (pos == null) return;
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { tone: select.value }));
      };

      select.addEventListener("change", onChange);
      dom.append(select, contentDOM);
      sync();

      return {
        dom,
        contentDOM,
        update(updated) {
          if (updated.type.name !== "callout") return false;
          node = updated;
          sync();
          return true;
        },
        destroy() {
          select.removeEventListener("change", onChange);
        },
      };
    },
  },
}));
```

Rules:

- Return `contentDOM` only when the node has editable content.
- Dispatch through `view.dispatch`; never set text directly.
- Destroy every listener. If the NodeView creates a React root, unmount it in
  `destroy()`. Prefer plain DOM NodeViews for simple nodes;
  `createReactNodeView` is available for complex React-driven nodes.

## Plugin with private state

```ts
import { defineExtension, type Command, type Editor } from "@rk/editor";
import { Plugin, PluginKey } from "prosemirror-state";

declare module "@rk/editor" {
  interface Commands {
    resetWordCount: Command;
  }
}

const RESET_WORD_COUNT = "example:reset-word-count";
const countKey = new PluginKey<number>("word-count");

const countWords = (doc: import("prosemirror-model").Node): number =>
  doc.textContent.split(/\s+/).filter(Boolean).length;

export const WordCount = defineExtension(() => ({
  name: "word-count",
  plugins: () => [
    new Plugin({
      key: countKey,
      state: {
        init: (_, state) => countWords(state.doc),
        apply: (tr, value, _oldState, newState) => {
          if (tr.getMeta(RESET_WORD_COUNT)) return 0;
          return tr.docChanged ? countWords(newState.doc) : value;
        },
      },
      view: () => ({
        update: () => {
          // read countKey.getState(view.state) to update DOM UI
        },
        destroy: () => {
          // remove listeners created by this view
        },
      }),
    }),
  ],
  commands: () => ({
    resetWordCount: (state, dispatch) => {
      if (!dispatch) return false;
      dispatch(state.tr.setMeta(RESET_WORD_COUNT, true));
      return true;
    },
  }),
}));
```

Read the value with `countKey.getState(editor.state)`. Never store counters on
the extension object, in a module variable or in React state.

## Decoration-based placeholder

Decorations are visual only; they do not change the document.

```ts
import { defineExtension } from "@rk/editor";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const placeholderKey = new PluginKey<DecorationSet>("placeholder");

function placeholderDecorations(doc: import("prosemirror-model").Node): DecorationSet {
  const first = doc.firstChild;

  if (doc.childCount === 1 && first && first.isTextblock && first.content.size === 0) {
    return DecorationSet.create(doc, [
      Decoration.node(0, first.nodeSize, {
        class: "is-empty",
        "data-placeholder": "Write something…",
      }),
    ]);
  }

  return DecorationSet.empty;
}

export const Placeholder = defineExtension(() => ({
  name: "placeholder",
  plugins: () => [
    new Plugin({
      key: placeholderKey,
      state: {
        init: (_, state) => placeholderDecorations(state.doc),
        apply: (tr, value, _oldState, newState) =>
          tr.docChanged ? placeholderDecorations(newState.doc) : value,
      },
      props: {
        decorations(state) {
          return placeholderKey.getState(state);
        },
      },
    }),
  ],
}));
```

Style it from the app:

```css
.ProseMirror .is-empty::before {
  content: attr(data-placeholder);
  color: gray;
  pointer-events: none;
}
```

## Cross-extension messaging with transaction meta

Transaction meta is the safe channel between extensions. Use a namespaced
string constant and handle it in a plugin's `apply`.

```ts
import type { Editor } from "@rk/editor";
import { Plugin, PluginKey } from "prosemirror-state";

export const REQUEST_PANEL_META = "example:request-panel";

interface Request {
  readonly panel: "toolbar" | "inspector";
  readonly reason: string;
}

export function requestPanel(editor: Editor, request: Request): void {
  editor.dispatch(editor.state.tr.setMeta(REQUEST_PANEL_META, request));
}

const requestsKey = new PluginKey<Request | null>("panel-requests");

export const panelRequests = new Plugin({
  key: requestsKey,
  state: {
    init: () => null,
    apply(tr, previous) {
      return (tr.getMeta(REQUEST_PANEL_META) as Request | undefined) ?? previous;
    },
  },
});
```

Notes:

- Meta is transient. If you need persistence, copy it into plugin state, as
  above, and clear it with another transaction when consumed.
- Do not use module-level variables or React state for editor state.
- Core already uses `CONTROLLED_UPDATE_META` for controlled content; do not
  reuse that key for extension signals.
- Import the constant from the owning extension package. Cross-extension
  imports are discouraged; share the key through a small public module rather
  than reaching into another extension's internals.

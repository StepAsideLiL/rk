# Write your first extension

This walkthrough builds a `Highlight` mark end to end: schema, commands, key
binding, input rule, markdown parsing and serialization, tests, and toolbar
wiring in the playground app.

The finished extension lives in `src/extensions/highlight/highlight.ts` in a
consumer package. Import the public entry points:

```ts
import {
  defineExtension,
  type Command,
  type Extension,
  type MdastMarkHandler,
  type PmMarkHandler,
} from "@rk/editor";
```

## 1. Schema and command

Create the mark with a DOM representation and a typed command.

```ts
import { toggleMark } from "prosemirror-commands";

declare module "@rk/editor" {
  interface Commands {
    toggleHighlight: Command;
  }
}

export const Highlight = defineExtension((): Extension => ({
  name: "highlight",
  priority: 60,
  requires: ["text"],
  marks: {
    highlight: {
      parseDOM: [{ tag: "mark" }],
      toDOM: () => ["mark", 0],
    },
  },
  commands(context) {
    const highlight = context.schema.marks.highlight;

    return highlight ? { toggleHighlight: toggleMark(highlight) } : {};
  },
  keymap(context) {
    const highlight = context.schema.marks.highlight;

    return highlight ? { "Mod-Shift-h": toggleMark(highlight) } : {};
  },
}));
```

`requires` lists **extension names**, not node names. `["text"]` guarantees the
inline text node exists.

## 2. Input rule

Typing `==marked==` should become a highlight. The input rule API is a plain
ProseMirror `InputRule`; mark input rules are not exported by the core package.

```ts
import { InputRule } from "prosemirror-inputrules";

inputRules(context) {
  const highlight = context.schema.marks.highlight;

  if (!highlight) {
    return [];
  }

  return [
    new InputRule(/(?<![=])==([^=]+)==$/, (state, match, start, end) => {
      const text = match[1];

      if (!text) {
        return null;
      }

      const marks = (
        state.storedMarks ?? state.doc.resolve(start).marks()
      ).concat(highlight.create());

      return state.tr.replaceWith(start, end, state.schema.text(text, marks));
    }),
  ];
}
```

## 3. Markdown: add a remark plugin

The markdown content flows through mdast. Add a remark plugin that:

1. rewrites `==text==` in text nodes into a custom `highlight` mdast node while
   parsing;
2. teaches `mdast-util-to-markdown` how to print that node while stringifying.

Add `mdast-util-to-markdown` and `unified` as dependencies (they are already
transitive dependencies of `remark-stringify`, but declare what you import).

```ts
import type { Nodes, Parent, PhrasingContent } from "mdast";
import type { Info, Options as ToMarkdownOptions, State } from "mdast-util-to-markdown";
import type { Plugin } from "unified";

type HighlightNode = { type: "highlight"; children: PhrasingContent[] };

export const remarkHighlight: Plugin = function remarkHighlight() {
  const data = this.data() as { toMarkdownExtensions?: ToMarkdownOptions[] };

  (data.toMarkdownExtensions ??= []).push({
    handlers: {
      highlight(node: unknown, _parent: unknown, state: State, info: Info) {
        return `==${state.containerPhrasing(node as Parent, info)}==`;
      },
    },
  } as unknown as ToMarkdownOptions);

  return (tree) => {
    rewrite(tree as Parent);
  };
};

function rewrite(parent: Parent): void {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (!child) {
      continue;
    }

    if (child.type === "text" && child.value.includes("==")) {
      const replacement: Nodes[] = [];
      const pattern = /==([^=]+)==/g;
      let cursor = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(child.value))) {
        if (match.index > cursor) {
          replacement.push({
            type: "text",
            value: child.value.slice(cursor, match.index),
          });
        }

        const highlighted: HighlightNode = {
          type: "highlight",
          children: [{ type: "text", value: match[1] ?? "" }],
        };

        replacement.push(highlighted as unknown as Nodes);
        cursor = match.index + match[0].length;
      }

      if (cursor < child.value.length) {
        replacement.push({ type: "text", value: child.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...replacement);
      index += replacement.length - 1;
      continue;
    }

    if ("children" in child) {
      rewrite(child as Parent);
    }
  }
}
```

## 4. Mark handlers

The shared mark helpers know `strong`, `emphasis`, `code` and `link`. Custom
marks are registered with `markFromMdast` / `markToMdast`. Add these fields to
the **same** `Highlight` object:

```ts
import type { Content } from "mdast";

const parseHighlight: MdastMarkHandler = (_node, schema) =>
  schema.marks.highlight?.create() ?? null;

const serializeHighlight: PmMarkHandler = (_mark, children) =>
  ({ type: "highlight", children }) as unknown as Content;

// inside the defineExtension object:
markdown: {
  remarkPlugins: [remarkHighlight],
  markFromMdast: { highlight: parseHighlight },
  markToMdast: { highlight: serializeHighlight },
},
```

`markFromMdast` is keyed by **mdast node type** and runs while parsing.
`markToMdast` is keyed by **ProseMirror mark name** and runs while serializing,
after the built-in `link > strong > emphasis` nesting. A `code` mark is emitted
as an `inlineCode` leaf and never wrapped by a custom mark.

## 5. Register and use it

```ts
// src/extensions/index.ts
export { Highlight } from "./highlight/highlight";

// starterKit
export function starterKit() {
  return [Document(), Text(), Paragraph(), Heading({}), Bold(), Italic(), Selection(), Highlight()];
}
```

A toolbar entry can read the active mark and call the command:

```tsx
const highlighted = useEditorState((state) =>
  state.doc.rangeHasMark(state.selection.from, state.selection.to, editor.schema.marks.highlight!),
);

<button aria-pressed={highlighted} onClick={() => editor.commands.toggleHighlight()}>
  Highlight
</button>;
```

## 6. Tests

Write the tests first, then implement. Minimal coverage:

```ts
import { TextSelection } from "prosemirror-state";
import { expect, it } from "vitest";
import { createTestEditor, docOf, press, roundTrip, textOf, typeText } from "@rk/editor/testing";
import { Bold, Document, Highlight, Italic, Paragraph, Text } from "./index";

const extensions = () => [Document(), Text(), Paragraph(), Bold(), Italic(), Highlight()];

it.each([
  ["==marked==", "==marked=="],
  ["**a ==b== c**", "**a ==b== c**"],
])("round trips %s", (input, expected) => {
  expect(roundTrip(extensions(), input)).toBe(expected);
});

it("toggles the mark", () => {
  const editor = createTestEditor(extensions(), "text");
  const { doc } = editor.state;

  editor.dispatch(editor.state.tr.setSelection(TextSelection.create(doc, 1, doc.content.size - 1)));

  expect(editor.commands.toggleHighlight()).toBe(true);
  expect(() => docOf(editor).check()).not.toThrow();
});

it("applies the input rule", () => {
  const editor = createTestEditor(extensions(), "");
  editor.dispatch(editor.state.tr.insertText("==marked="));

  expect(typeText(editor, "=")).toBe(true);
  expect(textOf(editor)).toBe("marked");
});
```

`press` is available for keymap tests even when this example does not use it.

`typeText` feeds text through the input-rules plugin. `press` runs keymap
bindings without a DOM. A `.dom.test.ts` file should additionally check the
`<mark>` DOM output and the NodeView lifecycle if the extension adds one.

## 7. What the core does with your contribution

- Parsing: markdown → `remark-parse` → remark plugins → `fromMdast` /
  `markFromMdast` → ProseMirror document.
- Serializing: ProseMirror document → `toMdast` / `markToMdast` → remark
  plugins → `remark-stringify` → markdown.
- Unknown mdast/ProseMirror nodes use the codec's strategy: `throw` in
  development, `preserve` in production unless configured otherwise.

See [the extension contract](./extension-contract.md) for the complete field
list and [the testing guide](./testing.md) for selection, stored-mark, DOM and
NodeView patterns.

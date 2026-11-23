# Testing guide

Tests run in two Vitest projects:

- **node** — core, markdown, HTML and extension tests (`environment: "node"`).
  HTML tests inject a `linkedom` document into the codec.
- **dom** — React tests and files named `*.dom.test.ts(x)` (`environment: "jsdom"`).

Use `@rk/editor/testing` for headless helpers.

## The helpers

```ts
import { createTestEditor, docOf, press, roundTrip, textOf, typeText } from "@rk/editor/testing";
```

| Helper                                   | Purpose                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `createTestEditor(extensions, content?)` | Headless editor with a markdown codec built from the same extensions. `content` is markdown. |
| `roundTrip(extensions, markdown)`        | Parses markdown, checks the document, serializes it again.                                   |
| `docOf(editor)`                          | Current ProseMirror document.                                                                |
| `textOf(editor)`                         | Current document text.                                                                       |
| `press(editor, "Mod-b")`                 | Runs keymap handlers through a minimal view; no DOM needed.                                  |
| `typeText(editor, "*")`                  | Feeds text through input rules and falls back to a normal insertion.                         |

## Round trips

```ts
import { expect, it } from "vitest";
import { roundTrip } from "@rk/editor/testing";
import { starterKit } from "@rk/editor/extensions";

it.each([
  ["**a**", "**a**"],
  ["*a*", "*a*"],
  ["# a", "# a"],
  ["**a *b* c**", "**a *b* c**"],
])("round trips %s", (input, expected) => {
  expect(roundTrip(starterKit(), input)).toBe(expected);
});
```

`roundTrip` calls `doc.check()` on every parsed document. Call
`docOf(editor).check()` directly when you need an explicit assertion.

## Commands and selections

```ts
import { TextSelection } from "prosemirror-state";
import { createTestEditor, docOf } from "@rk/editor/testing";

const editor = createTestEditor(starterKit(), "a");
const { doc } = editor.state;

editor.dispatch(editor.state.tr.setSelection(TextSelection.create(doc, 1, doc.content.size - 1)));

expect(editor.commands.toggleBold()).toBe(true);
expect(() => docOf(editor).check()).not.toThrow();
```

For an empty selection, `editor.commands.toggleBold()` sets stored marks:

```ts
expect(editor.commands.toggleBold()).toBe(true);
expect(editor.state.storedMarks?.some((mark) => mark.type.name === "strong")).toBe(true);
```

## Input rules

Type the text before the final trigger character, then let `typeText` run the
input-rules plugin:

```ts
const editor = createTestEditor(starterKit(), "");
editor.dispatch(editor.state.tr.insertText("**bold*"));

expect(typeText(editor, "*")).toBe(true);
expect(textOf(editor)).toBe("bold");
```

The same pattern tests headings (`"##"` then `" "`) and custom rules such as
`"==marked="` then `"="`.

## Keymaps

```ts
const editor = createTestEditor(starterKit(), "a");
// select the paragraph text first
expect(press(editor, "Mod-b")).toBe(true);
```

`press` returns `false` when no binding handled the key. It never creates a real
view.

## Unknown-node behaviour

Build a codec with only the extensions under test, then assert the strategy:

```ts
import { ExtensionManager, MarkdownCodec } from "@rk/editor";
import { Document, Paragraph, Text } from "@rk/editor/extensions";

const extensions = [Document(), Text(), Paragraph()];
const manager = new ExtensionManager(extensions);
const codec = new MarkdownCodec({ extensions });

expect(() => codec.parse("> quote", manager.schema)).toThrow(
  /No markdown handler for mdast node "blockquote"/,
);
```

In production builds the default is `preserve`; tests run in development and
therefore throw. Pass `unknownNode: "preserve"` or `"drop"` to exercise the other
modes.

## DOM tests

Only files named `*.dom.test.ts` or `*.dom.test.tsx` may touch the DOM. They run
in jsdom with `@testing-library/jest-dom` matchers and RTL cleanup.

```tsx
import { render } from "@testing-library/react";
import { EditorContent, EditorProvider } from "@rk/editor/react";
import { starterKit } from "@rk/editor/extensions";

const { container } = render(
  <EditorProvider extensions={starterKit()}>
    <EditorContent />
  </EditorProvider>,
);

expect(container.querySelector(".ProseMirror")).not.toBeNull();
```

For a NodeView, mount it with a real schema and spy on cleanup:

```ts
const destroy = vi.fn();
const nodeView = createReactNodeView(Component)(node, view, () => 0, [], decorations);
// mount nodeView.dom, assert it renders and updates
nodeView.destroy?.();
expect(destroy).toHaveBeenCalled();
expect((nodeView.dom as HTMLElement).innerHTML).toBe("");
```

DOM serialization tests use `DOMSerializer.fromSchema(schema)` and
`DOMParser.fromSchema(schema).parse(element)` to assert `toDOM` and `parseDOM`
agree.

## Property tests

`fast-check` is available for normalization guarantees:

```ts
fc.assert(
  fc.property(arbitraryDoc, (doc) => {
    doc.check();
    const first = codec.serialize(doc);
    const parsed = codec.parse(first, schema);
    parsed.check();
    expect(codec.serialize(parsed)).toBe(first);
  }),
  { numRuns: 50 },
);
```

See `src/extensions/markdown-property.test.ts` for a complete generator.

## HTML tests

The HTML codec needs a DOM only when parsing or serializing. Inject a
`linkedom` document in the node project:

```ts
import { parseHTML } from "linkedom";
import { HtmlCodec } from "@rk/editor/html";
import { starterKit } from "@rk/editor/extensions";

const { document } = parseHTML("<!doctype html><html><body></body></html>");
const codec = new HtmlCodec({ extensions: starterKit(), document });
```

HTML suites cover round trips, XSS, messy pasted markup, cross-format
conversion and a consistency guard that serializes every schema node and mark
through `toDOM`, then asserts the sanitizer leaves it unchanged. The guard fails
when an extension forgets `html.sanitize`.

## Test layout

- Unit tests live next to the extension: `heading/heading.test.ts`.
- HTML codec tests live in `src/html/*.test.ts` and use `linkedom`.
- DOM tests live next to the code: `heading/heading.dom.test.ts`.
- Benchmarks use `*.bench.ts` and run with `pnpm bench`.
- Coverage runs with `pnpm coverage`; it covers `src/core`, `src/markdown` and
  `src/html`.

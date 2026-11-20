# HTML codec

HTML is a second content codec alongside markdown. It deliberately does **not**
go through mdast: markdown cannot represent underline, colspan, CSS classes and
many other structures that HTML can.

```ts
import { createEditor } from "@rk/editor";
import { starterKit } from "@rk/editor/extensions";

const editor = createEditor({
  extensions: starterKit(),
  content: "<h1>Hi</h1><p><strong>HTML</strong></p>",
  contentType: "html",
});

editor.getHTML();
editor.getMarkdown();
editor.getJSON();
```

`createEditor` assembles the default markdown, HTML and JSON codecs. Pass
`codecs` to override one, or the legacy `markdown` option to replace only the
markdown codec.

## Pipeline

Parsing:

```text
html string
  → rehype-parse (fragment)
  → rehype-sanitize
  → rehype-stringify
  → DOMParser.fromSchema(schema).parse(dom)
```

Serialization:

```text
ProseMirror doc
  → DOMSerializer.fromSchema(schema)
  → html string
  → rehype-sanitize (defense in depth)
```

ProseMirror drives both directions through each extension's existing
`parseDOM`/`toDOM` specs. There are no per-extension HTML handlers.

The codec accepts an injectable `document`:

```ts
import { parseHTML } from "linkedom";
import { createHtmlCodec } from "@rk/editor/html";
import { starterKit } from "@rk/editor/extensions";

const { document } = parseHTML("<!doctype html><html><body></body></html>");
const codec = createHtmlCodec({ extensions: starterKit(), document });
```

The document is resolved lazily inside `parse`/`serialize`, never at module
load. Without an injected document or a global `document`, the codec can be
constructed but using it throws a clear error.

## Sanitizer contract

The sanitizer starts default-deny. Every top-level schema key is set explicitly
because `hast-util-sanitize` falls back to its permissive GitHub-style default
for missing keys.

Base behavior:

- No elements are allowed by default; text survives.
- `href` allows `http`, `https`, `mailto` and `tel`.
- `src` allows `http` and `https`.
- Scripts, styles, iframes, objects, embeds, form controls, SVG and MathML are
  always removed with their contents.
- Comments, doctypes, `style` attributes and event-handler attributes are
  removed unless an extension explicitly allows an attribute.
- Unknown or disallowed elements are unwrapped, keeping their text content.
  Pass `unknownElement: "drop"` to drop them with their content instead.

Extensions contribute only allowlist data through `html.sanitize`:

```ts
import { defineExtension, type Extension } from "@rk/editor";

export const Highlight = defineExtension((): Extension => ({
  name: "highlight",
  requires: ["text"],
  marks: {
    highlight: {
      parseDOM: [{ tag: "mark" }],
      toDOM: () => ["mark", 0],
    },
  },
  html: {
    sanitize: {
      tagNames: ["mark"],
      attributes: {},
      protocols: {},
    },
  },
}));
```

The allowlist must match `parseDOM` and `toDOM` exactly. Do not allow attributes
the extension does not read and write. For a link mark, for example:

```ts
html: {
  sanitize: {
    tagNames: ["a"],
    attributes: {
      a: ["href", "title", "rel", "target"],
    },
  },
},
```

`buildSanitizeSchema(extensions)` is exported from `@rk/editor/html` when an
application needs the merged schema for its own inspection or tests.

## Markdown is lossy, HTML is not

Markdown is the portable interchange format. It normalizes structure and drops
anything it cannot express. HTML keeps the full ProseMirror structure driven by
`toDOM`, including attributes and marks that have no markdown representation.

Choose the codec that matches the storage contract:

- Markdown: portable text, comments, docs, conversion to other tools.
- HTML: fidelity for structures markdown cannot express.
- JSON: exact ProseMirror document data, useful for persistence and debugging.

## Raw HTML in markdown

Raw HTML nodes in markdown are not parsed into DOM or HTML. They reuse the
markdown codec's unknown-node strategy:

- default `"throw"` in development
- default `"preserve"` in production, where the raw text is kept as literal text

If an application wants raw markdown HTML to become editor content, it should
choose the HTML codec or add an explicit markdown handler; the editor never
executes raw HTML.

## Boundaries

`src/html` may import only `src/core`. Extensions do not import `src/html`, and
core does not import codecs. The public `createEditor` wrapper is the single
assembly point that knows about markdown and HTML.

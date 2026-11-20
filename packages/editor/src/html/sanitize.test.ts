import type { Node as PmNode } from "prosemirror-model";
import { DOMSerializer } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { createExtensionManager } from "../core/extension-manager";
import { defineExtension } from "../core/types";
import { Document, Paragraph, Text } from "../extensions/index";
import { starterKit } from "../extensions/index";
import { createHtmlCodec } from "./codec";
import { document, extensions, roundTripHtml } from "./fixtures.test-utils";
import { buildSanitizeSchema } from "./sanitize";

/** Link mark used to exercise protocol allowlists. */
const Link = defineExtension(() => ({
  name: "test-link",
  priority: 60,
  requires: ["text"],
  marks: {
    link: {
      attrs: { href: { default: null }, title: { default: null } },
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (node) => ({
            href: (node as Element).getAttribute("href"),
            title: (node as Element).getAttribute("title"),
          }),
        },
      ],
      toDOM: (mark) => [
        "a",
        {
          href: mark.attrs.href as string,
          title: mark.attrs.title as string | null,
        },
        0,
      ],
    },
  },
  html: {
    sanitize: {
      tagNames: ["a"],
      attributes: { a: ["href", "title"] },
    },
  },
}));

const linkExtensions = [Document(), Text(), Paragraph(), Link()];

describe("HTML sanitizer", () => {
  it.each([
    ["<script>alert(1)</script><p>ok</p>", "<p>ok</p>"],
    ["<p>before<img src=x onerror=alert(1)>after</p>", "<p>beforeafter</p>"],
    ["<svg onload=alert(1)><text>hi</text></svg><p>ok</p>", "<p>ok</p>"],
    ['<iframe src="https://example.com">fallback</iframe><p>ok</p>', "<p>ok</p>"],
    ['<p style="color:red">x</p>', "<p>x</p>"],
    ['<p onclick="alert(1)">x</p>', "<p>x</p>"],
    ["<!-- comment --><p>x</p>", "<p>x</p>"],
    ["<style>p{color:red}</style><p>x</p>", "<p>x</p>"],
    [
      '<div><span style="font-weight:bold">Pasted</span> <b>text</b></div>',
      "<p>Pasted <strong>text</strong></p>",
    ],
  ])("removes unsafe markup from %s", (input, expected) => {
    expect(roundTripHtml(input)).toBe(expected);
  });

  it("does not let dangerous patterns survive", () => {
    const inputs = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      '<a href="javascript:alert(1)">x</a>',
      '<a href="JaVaScRiPt:alert(1)">x</a>',
      '<a href="data:text/html,hi">x</a>',
      "<svg onload=alert(1)></svg>",
      '<iframe src="https://example.com"></iframe>',
      '<p style="color:red">x</p>',
    ];

    for (const input of inputs) {
      const output = roundTripHtml(input, linkExtensions);

      expect(output).not.toMatch(
        /<script|<style|<iframe|<svg|onerror|onload|javascript:|data:|style=/i,
      );
    }
  });

  it.each([
    ["https://example.com", true],
    ["http://example.com", true],
    ["mailto:a@example.com", true],
    ["tel:+123", true],
    ["javascript:alert(1)", false],
    ["JaVaScRiPt:alert(1)", false],
    ["data:text/html,hi", false],
  ])("applies link protocols to %s", (href, kept) => {
    const output = roundTripHtml(`<p><a href="${href}">x</a></p>`, linkExtensions);

    expect(output).toBe(kept ? `<p><a href="${href}">x</a></p>` : "<p>x</p>");
  });

  it("drops unknown elements and their content in drop mode", () => {
    const manager = createExtensionManager(extensions);
    const dropCodec = createHtmlCodec({
      extensions,
      document,
      unknownElement: "drop",
    });

    expect(roundTripHtml("<div><p>x</p></div>")).toBe("<p>x</p>");
    expect(dropCodec.serialize(dropCodec.parse("<div><p>x</p></div>", manager.schema))).toBe(
      "<p></p>",
    );
    expect(dropCodec.serialize(dropCodec.parse("<p>a<span>b</span>c</p>", manager.schema))).toBe(
      "<p>ac</p>",
    );
  });
});

describe("HTML allowlists", () => {
  const manager = createExtensionManager(starterKit());
  const sanitizer = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, buildSanitizeSchema(starterKit()))
    .use(rehypeStringify);
  const serializer = DOMSerializer.fromSchema(manager.schema);

  it.each(renderCases())("keeps %s output unchanged", (_name, node) => {
    const container = document.createElement("div");
    container.append(serializer.serializeFragment(node.content, { document }));
    const html = container.innerHTML;

    expect(String(sanitizer.processSync(html))).toBe(html);
  });

  function renderCases(): Array<[string, PmNode]> {
    const cases: Array<[string, PmNode]> = [];

    for (const [name, type] of Object.entries(manager.schema.nodes)) {
      if (name === "doc" || type.isText || !type.spec.toDOM) {
        continue;
      }

      const node = type.createAndFill();

      if (!node) {
        throw new Error(`Could not create a representative "${name}" node.`);
      }

      cases.push([name, node]);
    }

    for (const [name, mark] of Object.entries(manager.schema.marks)) {
      const paragraph = manager.schema.nodes.paragraph;

      if (!paragraph) {
        throw new Error("Missing paragraph node.");
      }

      cases.push([
        `mark:${name}`,
        paragraph.create(null, [manager.schema.text("marked", [mark.create()])]),
      ]);
    }

    return cases;
  }
});

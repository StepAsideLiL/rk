import type { PhrasingContent } from "mdast";
import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { inlineFromMdast, inlineToMdast, markFromMdast, withMdastMarks } from "./marks";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    hard_break: { inline: true, group: "inline" },
  },
  marks: {
    strong: {},
    emphasis: {},
    code: {},
    link: { attrs: { href: { default: "" }, title: { default: null } } },
  },
});

const markNames = (node: { marks: readonly { type: { name: string } }[] }) =>
  node.marks.map((mark) => mark.type.name).sort();

describe("markFromMdast", () => {
  it("maps mark wrappers to schema marks", () => {
    expect(markFromMdast({ type: "strong", children: [] }, schema)?.type.name).toBe("strong");
    expect(markFromMdast({ type: "emphasis", children: [] }, schema)?.type.name).toBe("emphasis");
    expect(markFromMdast({ type: "inlineCode", value: "x" }, schema)?.type.name).toBe("code");
    expect(
      markFromMdast({ type: "link", url: "https://example.com", title: null, children: [] }, schema)
        ?.attrs,
    ).toEqual({ href: "https://example.com", title: null });
  });

  it("returns null when the schema lacks the mark", () => {
    const bare = new Schema({
      nodes: {
        doc: { content: "block+" },
        text: { group: "inline" },
        paragraph: { group: "block", content: "inline*" },
      },
    });

    expect(markFromMdast({ type: "strong", children: [] }, bare)).toBeNull();
  });
});

describe("inlineFromMdast", () => {
  it("flattens nested mark wrappers into mark sets", () => {
    const mdast: PhrasingContent[] = [
      {
        type: "strong",
        children: [
          { type: "text", value: "a " },
          { type: "emphasis", children: [{ type: "text", value: "b" }] },
          { type: "text", value: " c" },
        ],
      },
    ];

    const nodes = inlineFromMdast(mdast, schema);

    expect(nodes.map((node) => node.text)).toEqual(["a ", "b", " c"]);
    expect(nodes.map(markNames)).toEqual([["strong"], ["emphasis", "strong"], ["strong"]]);
  });

  it("applies the code mark to inline code", () => {
    const nodes = inlineFromMdast(
      [
        {
          type: "strong",
          children: [
            { type: "text", value: "a " },
            { type: "inlineCode", value: "b" },
          ],
        },
      ],
      schema,
    );

    expect(nodes.map(markNames)).toEqual([["strong"], ["code", "strong"]]);
  });

  it("carries link attributes", () => {
    const nodes = inlineFromMdast(
      [
        {
          type: "link",
          url: "https://example.com",
          title: "Example",
          children: [{ type: "text", value: "link" }],
        },
      ],
      schema,
    );

    expect(nodes[0]?.marks[0]?.attrs).toEqual({
      href: "https://example.com",
      title: "Example",
    });
  });

  it("drops unknown inline nodes when no callback is provided", () => {
    const nodes = inlineFromMdast([{ type: "break" }], schema);

    expect(nodes).toHaveLength(0);
  });
});

describe("inlineToMdast", () => {
  it("re-nests marks in the deterministic order", () => {
    const mdast = inlineToMdast([
      schema.text("a ", [schema.marks.strong.create()]),
      schema.text("b", [schema.marks.strong.create(), schema.marks.emphasis.create()]),
      schema.text(" c", [schema.marks.strong.create()]),
    ]);

    expect(mdast).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", value: "a " },
          { type: "emphasis", children: [{ type: "text", value: "b" }] },
          { type: "text", value: " c" },
        ],
      },
    ]);
  });

  it("merges adjacent text with the same marks", () => {
    expect(
      inlineToMdast([
        schema.text("a", [schema.marks.strong.create()]),
        schema.text("b", [schema.marks.strong.create()]),
      ]),
    ).toEqual([{ type: "strong", children: [{ type: "text", value: "ab" }] }]);
  });

  it("keeps code spans inside surrounding marks", () => {
    expect(
      inlineToMdast([
        schema.text("a ", [schema.marks.strong.create()]),
        schema.text("b", [schema.marks.strong.create(), schema.marks.code.create()]),
        schema.text(" c", [schema.marks.strong.create()]),
      ]),
    ).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", value: "a " },
          { type: "inlineCode", value: "b" },
          { type: "text", value: " c" },
        ],
      },
    ]);
  });

  it("emits unmarked text verbatim", () => {
    expect(inlineToMdast([schema.text("plain")])).toEqual([{ type: "text", value: "plain" }]);
  });
});

describe("mark helper edge cases", () => {
  it("serializes link marks with and without attributes", () => {
    const link = schema.marks.link;

    if (!link) {
      throw new Error("Missing link mark.");
    }

    expect(
      inlineToMdast([schema.text("a", [link.create({ href: "https://x", title: "T" })])]),
    ).toEqual([
      {
        type: "link",
        url: "https://x",
        title: "T",
        children: [{ type: "text", value: "a" }],
      },
    ]);

    expect(inlineToMdast([schema.text("a", [link.create({})])])).toEqual([
      {
        type: "link",
        url: "",
        title: null,
        children: [{ type: "text", value: "a" }],
      },
    ]);
  });

  it("merges adjacent inline code spans", () => {
    const code = schema.marks.code;

    if (!code) {
      throw new Error("Missing code mark.");
    }

    expect(
      inlineToMdast([schema.text("a", [code.create()]), schema.text("b", [code.create()])]),
    ).toEqual([{ type: "inlineCode", value: "ab" }]);
  });

  it("delegates and drops non-text nodes through onNode", () => {
    const hardBreak = schema.nodes.hard_break;

    if (!hardBreak) {
      throw new Error("Missing hard break node.");
    }

    expect(
      inlineToMdast([hardBreak.create()], {
        onNode: () => [{ type: "break" }],
      }),
    ).toEqual([{ type: "break" }]);
    expect(inlineToMdast([hardBreak.create()], { onNode: () => null })).toEqual([]);
  });

  it("passes active marks to the unknown-inline callback", () => {
    const nodes = inlineFromMdast([{ type: "strong", children: [{ type: "break" }] }], schema, {
      onUnknown: (_node, marks) => [schema.text("!", marks)],
    });

    expect(nodes[0]?.marks.map((mark) => mark.type.name)).toEqual(["strong"]);
  });

  it("leaves inline code unmarked when the schema has no code mark", () => {
    const bare = new Schema({
      nodes: {
        doc: { content: "block+" },
        text: { group: "inline" },
        paragraph: { group: "block", content: "inline*" },
      },
    });

    const nodes = inlineFromMdast([{ type: "inlineCode", value: "x" }], bare);

    expect(nodes[0]?.marks).toEqual([]);
  });

  it("returns nodes unchanged when applying no marks", () => {
    const node = { type: "text", value: "x" } as const;

    expect(withMdastMarks(node, [])).toBe(node);
  });
});

describe("withMdastMarks", () => {
  it("wraps a text node with marks", () => {
    expect(withMdastMarks({ type: "text", value: "x" }, [schema.marks.strong.create()])).toEqual({
      type: "strong",
      children: [{ type: "text", value: "x" }],
    });
  });

  it("leaves non-text nodes untouched", () => {
    const node = { type: "inlineCode", value: "x" } as const;

    expect(withMdastMarks(node, [schema.marks.strong.create()])).toBe(node);
  });
});

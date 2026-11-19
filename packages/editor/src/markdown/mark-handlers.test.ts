import type { BlockContent, Content, PhrasingContent, Root } from "mdast";
import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import type { CollectedMarkdown } from "../core/extension-manager";
import { fromMdastRoot, toMdastRoot } from "./convert";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
  },
  marks: {
    highlight: {},
  },
});

const handlers: CollectedMarkdown = {
  fromMdast: {
    root: (node, state) => {
      if (node.type !== "root") {
        return null;
      }

      const doc = state.schema.nodes.doc;

      return doc ? doc.create(null, state.block(node.children as BlockContent[])) : null;
    },
    paragraph: (node, state) =>
      node.type === "paragraph"
        ? (state.schema.nodes.paragraph?.create(null, state.inline(node.children)) ?? null)
        : null,
  },
  toMdast: {
    doc: (node, state) => state.block(node.content.content),
    paragraph: (node, state) => ({
      type: "paragraph",
      children: state.inline(node.content.content) as PhrasingContent[],
    }),
  },
  markFromMdast: {
    highlight: (_node, currentSchema) => currentSchema.marks.highlight?.create() ?? null,
  },
  markToMdast: {
    highlight: (_mark, children) => ({ type: "highlight", children }) as unknown as Content,
  },
  remarkPlugins: [],
};

const highlightRoot = {
  type: "root",
  children: [
    {
      type: "paragraph",
      children: [
        {
          type: "highlight",
          children: [{ type: "text", value: "marked" }],
        },
      ],
    },
  ],
} as unknown as Root;

describe("extension mark handlers", () => {
  it("parses custom mdast mark nodes into ProseMirror marks", () => {
    const doc = fromMdastRoot(highlightRoot, schema, handlers, "throw");
    const text = doc.firstChild?.firstChild;

    expect(text?.text).toBe("marked");
    expect(text?.marks.map((mark) => mark.type.name)).toEqual(["highlight"]);
  });

  it("serializes custom ProseMirror marks back to mdast", () => {
    const highlight = schema.marks.highlight;

    if (!highlight) {
      throw new Error("Missing highlight mark.");
    }

    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("marked", [highlight.create()])),
    ]);
    const root = toMdastRoot(doc, handlers, "throw");

    expect(root.children[0]).toMatchObject({
      type: "paragraph",
      children: [
        {
          type: "highlight",
          children: [{ type: "text", value: "marked" }],
        },
      ],
    });
  });
});

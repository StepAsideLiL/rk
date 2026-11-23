import type { Content, PhrasingContent, Root } from "mdast";
import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import type { CollectedMarkdown } from "../core/extension-manager";
import { fromMdastRoot, toMdastRoot } from "./convert";
import { testExtensions } from "./fixtures.test-utils";

const manager = new ExtensionManager(testExtensions);
const schema = manager.schema;
const paragraphHandler = manager.markdown.fromMdast.paragraph;

if (!paragraphHandler) {
  throw new Error("Fixture paragraph handler is missing.");
}

const root = (children: Root["children"]): Root => ({ type: "root", children });

const emptyHandlers: CollectedMarkdown = {
  fromMdast: {},
  toMdast: {},
  markFromMdast: {},
  markToMdast: {},
  remarkPlugins: [],
};

describe("fromMdastRoot", () => {
  it("preserves, drops or throws when no root handler exists", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        paragraph: paragraphHandler,
      },
    };
    const mdast = root([{ type: "paragraph", children: [{ type: "text", value: "x" }] }]);

    expect(fromMdastRoot(mdast, schema, handlers, "preserve").textContent).toBe("x");
    expect(fromMdastRoot(mdast, schema, handlers, "drop").textContent).toBe("");
    expect(() => fromMdastRoot(mdast, schema, handlers, "throw")).toThrow(/mdast node "root"/);
  });

  it("falls back to the strategy when the root handler returns null", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        root: () => null,
      },
    };
    const mdast = root([{ type: "paragraph", children: [{ type: "text", value: "x" }] }]);

    expect(() => fromMdastRoot(mdast, schema, handlers, "throw")).toThrow(/mdast node "root"/);
    expect(fromMdastRoot(mdast, schema, handlers, "drop").textContent).toBe("");
  });

  it("falls back when the root handler returns no nodes", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        root: () => [],
      },
    };
    const mdast = root([{ type: "paragraph", children: [{ type: "text", value: "x" }] }]);

    expect(fromMdastRoot(mdast, schema, handlers, "drop").textContent).toBe("");
  });

  it("drops unknown blocks with neither children nor a value", () => {
    expect(
      fromMdastRoot(root([{ type: "thematicBreak" }]), schema, manager.markdown, "preserve")
        .textContent,
    ).toBe("");
  });

  it("drops unknown inline nodes with neither children nor a value", () => {
    const mdast = root([
      {
        type: "paragraph",
        children: [{ type: "image", url: "x", alt: "x", title: null }],
      },
    ]);

    expect(fromMdastRoot(mdast, schema, manager.markdown, "preserve").textContent).toBe("");
  });

  it("preserves unknown block values as paragraphs", () => {
    const mdast = root([{ type: "code", value: "x" }]);

    expect(fromMdastRoot(mdast, schema, manager.markdown, "preserve").textContent).toBe("x");
  });

  it("drops unknown block values when the schema has no paragraph", () => {
    const noParagraph = new Schema({
      nodes: {
        doc: { content: "block+" },
        text: { group: "inline" },
        heading: { group: "block", content: "inline*" },
      },
    });
    const mdast = root([{ type: "code", value: "x" }]);

    expect(fromMdastRoot(mdast, noParagraph, emptyHandlers, "preserve").textContent).toBe("");
  });

  it("throws when preserved content does not fit the document", () => {
    const strict = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        text: { group: "inline" },
        paragraph: { group: "block", content: "inline*" },
        blockquote: { group: "block", content: "block+" },
      },
    });
    const handlers: CollectedMarkdown = {
      ...emptyHandlers,
      fromMdast: {
        blockquote: () => strict.nodes.blockquote?.create() ?? null,
      },
    };
    const mdast = root([{ type: "blockquote", children: [] }]);

    expect(() => fromMdastRoot(mdast, strict, handlers, "preserve")).toThrow(
      /Could not build a document/,
    );
  });

  it("preserves unknown inline children and literal values", () => {
    const paragraph = (child: PhrasingContent): Root =>
      root([{ type: "paragraph", children: [child] }]);

    expect(
      fromMdastRoot(
        paragraph({
          type: "delete",
          children: [{ type: "text", value: "gone" }],
        }),
        schema,
        manager.markdown,
        "preserve",
      ).textContent,
    ).toBe("gone");

    expect(
      fromMdastRoot(
        paragraph({ type: "html", value: "<b>x</b>" }),
        schema,
        manager.markdown,
        "preserve",
      ).textContent,
    ).toBe("<b>x</b>");

    expect(
      fromMdastRoot(
        paragraph({
          type: "delete",
          children: [{ type: "text", value: "gone" }],
        }),
        schema,
        manager.markdown,
        "drop",
      ).textContent,
    ).toBe("");

    expect(() =>
      fromMdastRoot(
        paragraph({
          type: "delete",
          children: [{ type: "text", value: "gone" }],
        }),
        schema,
        manager.markdown,
        "throw",
      ),
    ).toThrow(/mdast node "delete"/);
  });
});

describe("toMdastRoot", () => {
  const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("x"))]);

  it("preserves, drops or throws when no doc handler matches", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: {
        ...manager.markdown.toMdast,
        doc: () => null,
      },
    };

    expect(toMdastRoot(doc, handlers, "preserve").children).toHaveLength(1);
    expect(toMdastRoot(doc, { ...emptyHandlers, toMdast: {} }, "drop").children).toEqual([]);
    expect(() => toMdastRoot(doc, { ...emptyHandlers, toMdast: {} }, "throw")).toThrow(
      /ProseMirror node "doc"/,
    );
  });

  it("accepts a root, an array or a single node from the doc handler", () => {
    const paragraph = {
      type: "paragraph" as const,
      children: [{ type: "text" as const, value: "p" }],
    };
    const asRoot: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: { doc: () => ({ type: "root", children: [paragraph] }) as unknown as Content },
    };
    const asArray: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: { doc: () => [paragraph] },
    };
    const asNode: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: { doc: () => paragraph },
    };

    expect(toMdastRoot(doc, asRoot, "throw").children).toHaveLength(1);
    expect(toMdastRoot(doc, asArray, "throw").children).toHaveLength(1);
    expect(toMdastRoot(doc, asNode, "throw").children).toHaveLength(1);
  });

  it("preserves unknown inline nodes through the strategy", () => {
    const mini = new Schema({
      nodes: {
        doc: { content: "block+" },
        text: { group: "inline" },
        paragraph: { group: "block", content: "inline*" },
        inline_box: { inline: true, group: "inline", content: "inline*" },
      },
    });
    const handlers: CollectedMarkdown = {
      fromMdast: {},
      markFromMdast: {},
      markToMdast: {},
      remarkPlugins: [],
      toMdast: {
        doc: (node, state) => state.block(node.content.content),
        paragraph: (node, state) => ({
          type: "paragraph",
          children: state.inline(node.content.content) as PhrasingContent[],
        }),
      },
    };
    const miniDoc = mini.node("doc", null, [
      mini.node("paragraph", null, [mini.node("inline_box", null, mini.text("kept"))]),
    ]);

    expect(toMdastRoot(miniDoc, handlers, "preserve").children).toHaveLength(1);
    expect(toMdastRoot(miniDoc, handlers, "drop").children).toHaveLength(1);
    expect(() => toMdastRoot(miniDoc, handlers, "throw")).toThrow(/ProseMirror node "inline_box"/);
  });
});

describe("handler helpers", () => {
  it("preserves inline content when an inline handler returns null", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        delete: () => null,
      },
    };
    const mdast = root([
      {
        type: "paragraph",
        children: [{ type: "delete", children: [{ type: "text", value: "gone" }] }],
      },
    ]);

    expect(fromMdastRoot(mdast, schema, handlers, "preserve").textContent).toBe("gone");
  });

  it("uses registered inline handlers", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        break: (node, state) => (node.type === "break" ? state.schema.text("?") : null),
      },
    };
    const mdast = root([{ type: "paragraph", children: [{ type: "break" }] }]);

    expect(fromMdastRoot(mdast, schema, handlers, "throw").textContent).toBe("?");
  });

  it("uses the text helper from the parsing state", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        root: (_node, state) => {
          const doc = state.schema.nodes.doc;
          const paragraph = state.schema.nodes.paragraph;

          if (!doc || !paragraph) {
            return null;
          }

          return doc.create(null, [
            paragraph.create(null, state.text({ type: "text", value: "t" })),
          ]);
        },
      },
    };

    expect(fromMdastRoot(root([]), schema, handlers, "throw").textContent).toBe("t");
  });

  it("leaves block nodes unchanged when applying marks", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        root: (_node, state) => {
          const doc = state.schema.nodes.doc;
          const paragraph = state.schema.nodes.paragraph;
          const strong = state.schema.marks.strong;

          if (!doc || !paragraph || !strong) {
            return null;
          }

          const block = paragraph.create(null, state.schema.text("x"));
          const marked = state.withMarks(block, [strong.create()]);

          expect(marked).toBe(block);

          return doc.create(null, [block]);
        },
      },
    };

    expect(fromMdastRoot(root([]), schema, handlers, "throw").textContent).toBe("x");
  });

  it("supports withMarks and array root results", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      fromMdast: {
        ...manager.markdown.fromMdast,
        root: (_node, state) => {
          const doc = state.schema.nodes.doc;
          const paragraph = state.schema.nodes.paragraph;
          const strong = state.schema.marks.strong;

          if (!doc || !paragraph || !strong) {
            return null;
          }

          const text = state.withMarks(state.schema.text("m"), [strong.create()]);

          return [doc.create(null, [paragraph.create(null, text)])];
        },
      },
    };
    const doc = fromMdastRoot(root([]), schema, handlers, "throw");

    expect(doc.textContent).toBe("m");
    expect(doc.firstChild?.firstChild?.marks[0]?.type.name).toBe("strong");
  });

  it("supports withMarks when serializing", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: {
        ...manager.markdown.toMdast,
        paragraph: (_node, state) => {
          const strong = state.schema.marks.strong;

          return {
            type: "paragraph",
            children: [
              state.withMarks({ type: "text", value: "m" }, strong ? [strong.create()] : []),
            ] as PhrasingContent[],
          };
        },
      },
    };
    const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("x"))]);

    expect(toMdastRoot(doc, handlers, "throw").children[0]).toMatchObject({
      type: "paragraph",
      children: [{ type: "strong" }],
    });
  });

  it("preserves bare text nodes", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: {
        ...manager.markdown.toMdast,
        doc: (_node, state) => state.block([state.schema.text("x")]),
      },
    };
    const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("x"))]);

    expect(toMdastRoot(doc, handlers, "preserve").children[0]).toEqual({
      type: "text",
      value: "x",
    });
  });

  it("uses the text helper from the serializing state", () => {
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: {
        ...manager.markdown.toMdast,
        paragraph: (_node, state) => ({
          type: "paragraph",
          children: [state.text(state.schema.text("x"))] as PhrasingContent[],
        }),
      },
    };
    const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("x"))]);

    expect(toMdastRoot(doc, handlers, "throw").children[0]).toMatchObject({
      children: [{ type: "text", value: "x" }],
    });
  });

  it("returns empty text for non-text nodes in the text helper", () => {
    let text: Content | undefined;
    const handlers: CollectedMarkdown = {
      ...manager.markdown,
      toMdast: {
        ...manager.markdown.toMdast,
        paragraph: (_node, state) => {
          const paragraph = state.schema.nodes.paragraph;

          if (!paragraph) {
            return null;
          }

          text = state.text(paragraph.create());

          return { type: "paragraph", children: [] };
        },
      },
    };
    const doc = schema.node("doc", null, [schema.node("paragraph")]);

    toMdastRoot(doc, handlers, "throw");

    expect(text).toEqual({ type: "text", value: "" });
  });
});

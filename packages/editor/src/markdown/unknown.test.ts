import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import { MarkdownCodec } from "./codec";
import { testExtensions } from "./fixtures.test-utils";

const manager = new ExtensionManager(testExtensions);
const schema = manager.schema;

const codecs = {
  throw: new MarkdownCodec({ extensions: testExtensions, unknownNode: "throw" }),
  drop: new MarkdownCodec({ extensions: testExtensions, unknownNode: "drop" }),
  preserve: new MarkdownCodec({
    extensions: testExtensions,
    unknownNode: "preserve",
  }),
};

const quoteDoc = schema.node("doc", null, [
  schema.node("blockquote", null, [schema.node("paragraph", null, schema.text("quote"))]),
]);

describe("unknown mdast nodes", () => {
  it("throws with the node type in the message", () => {
    expect(() => codecs.throw.parse("> quote", schema)).toThrow(
      'No markdown handler for mdast node "blockquote".',
    );
  });

  it("drops the node and keeps the document valid", () => {
    const doc = codecs.drop.parse("> quote", schema);

    doc.check();
    expect(doc.textContent).toBe("");
  });

  it("preserves the node's block content", () => {
    expect(codecs.preserve.parse("> quote", schema).textContent).toBe("quote");
  });
});

describe("unknown ProseMirror nodes", () => {
  it("throws with the node type in the message", () => {
    expect(() => codecs.throw.serialize(quoteDoc)).toThrow(
      'No markdown handler for ProseMirror node "blockquote".',
    );
  });

  it("drops the node", () => {
    expect(codecs.drop.serialize(quoteDoc)).toBe("");
  });

  it("preserves the node's block content", () => {
    expect(codecs.preserve.serialize(quoteDoc)).toBe("quote");
  });
});

describe("default strategy", () => {
  it("throws in the development environment", () => {
    const codec = new MarkdownCodec({ extensions: testExtensions });

    expect(import.meta.env.DEV).toBe(true);
    expect(() => codec.parse("> quote", schema)).toThrow(/blockquote/);
  });
});

import { describe, expect, it } from "vitest";

import { Editor } from "../editor";
import { ExtensionManager } from "../core/extension-manager";
import { MarkdownCodec } from "./codec";
import { testExtensions } from "./test/fixtures";

const manager = new ExtensionManager(testExtensions);
const schema = manager.schema;
const codec = new MarkdownCodec({ extensions: testExtensions });

function roundTrip(markdown: string): string {
  const doc = codec.parse(markdown, schema);
  doc.check();
  return codec.serialize(doc);
}

describe("markdown round trips", () => {
  it.each([
    ["**a *b* c**", "**a *b* c**"],
    ["*a **b***", "*a&#x20;*__*b*__"],
    ["**a***b*", "**a**_b_"],
    ["**a** *b*", "**a** *b*"],
    ["plain **a** plain", "plain **a** plain"],
    ["**a `b` c**", "**a `b` c**"],
    ["***a***", "**_a_**"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(input)).toBe(expected);
  });

  it("keeps every produced document valid", () => {
    for (const markdown of ["**a**", "*a*", "`a`", "**a `b` c**", "- a"]) {
      const doc = codec.parse(markdown, schema);
      expect(() => doc.check()).not.toThrow();
    }
  });
});

describe("markdown normalization", () => {
  it.each([
    ["__a__", "**a**"],
    ["* one\n* two", "- one\n- two"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(roundTrip(input)).toBe(expected);
  });
});

describe("editor markdown integration", () => {
  it("parses markdown content and serializes with getMarkdown", () => {
    const editor = new Editor({
      extensions: testExtensions,
      markdown: codec,
      content: "**a *b* c**",
      contentType: "markdown",
    });

    editor.state.doc.check();
    expect(editor.getMarkdown()).toBe("**a *b* c**");
    editor.destroy();
  });

  it("provides a default markdown codec", () => {
    const editor = new Editor({
      extensions: testExtensions,
      content: "**a**",
      contentType: "markdown",
    });

    editor.state.doc.check();
    expect(editor.getMarkdown()).toBe("**a**");
    editor.destroy();
  });
});

import { describe, expect, it } from "vitest";

import { createEditor } from "../core/create-editor";
import { createExtensionManager } from "../core/extension-manager";
import { createMarkdownCodec } from "./codec";
import { testExtensions } from "./fixtures.test-utils";

const manager = createExtensionManager(testExtensions);
const schema = manager.schema;
const codec = createMarkdownCodec({ extensions: testExtensions });

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
    const editor = createEditor({
      extensions: testExtensions,
      markdown: codec,
      content: "**a *b* c**",
      contentType: "markdown",
    });

    editor.state.doc.check();
    expect(editor.getMarkdown()).toBe("**a *b* c**");
    editor.destroy();
  });

  it("requires the codec for markdown content and getMarkdown", () => {
    expect(() =>
      createEditor({
        extensions: testExtensions,
        content: "x",
        contentType: "markdown",
      }),
    ).toThrow(/markdown codec/);

    const editor = createEditor({ extensions: testExtensions });
    expect(() => editor.getMarkdown()).toThrow(/markdown codec/);
    editor.destroy();
  });
});

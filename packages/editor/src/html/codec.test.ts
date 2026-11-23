import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import { HtmlCodec } from "./codec";
import { codec, extensions, roundTripHtml } from "./fixtures.test-utils";

const manager = new ExtensionManager(extensions);

describe("HTML codec", () => {
  it.each([
    ["<p>plain</p>", "<p>plain</p>"],
    ["<h1>Title</h1>", "<h1>Title</h1>"],
    ["<h2>Two</h2>", "<h2>Two</h2>"],
    ["<p><strong>bold</strong></p>", "<p><strong>bold</strong></p>"],
    ["<p><b>bold</b></p>", "<p><strong>bold</strong></p>"],
    ["<p><em>italic</em></p>", "<p><em>italic</em></p>"],
    ["<p><i>italic</i></p>", "<p><em>italic</em></p>"],
    ["<div><p>nested</p></div>", "<p>nested</p>"],
    ["<div>text</div>", "<p>text</p>"],
    ["<p>a<span>b</span>c</p>", "<p>abc</p>"],
    ["<p>a<unknown>b</unknown>c</p>", "<p>abc</p>"],
    ["<p><b>bold</p>", "<p><strong>bold</strong></p>"],
    ["hello", "<p>hello</p>"],
    ["<p>one</p><p>two</p>", "<p>one</p><p>two</p>"],
  ])("round trips %s", (input, expected) => {
    const first = roundTripHtml(input);

    expect(first).toBe(expected);
    expect(roundTripHtml(first)).toBe(first);
  });

  it("keeps nbsp text content", () => {
    const parsed = codec.parse("<p>a&nbsp;b</p>", manager.schema);

    expect(parsed.textContent).toBe("a\u00a0b");
    expect(roundTripHtml("<p>a&nbsp;b</p>")).toBe(roundTripHtml(roundTripHtml("<p>a&nbsp;b</p>")));
  });

  it("keeps every produced document valid", () => {
    for (const html of [
      "<p>a</p>",
      "<h1>a</h1>",
      "<p><strong>a</strong></p>",
      "<p><em>a</em></p>",
    ]) {
      const doc = codec.parse(html, manager.schema);

      expect(() => doc.check()).not.toThrow();
    }
  });

  it("parses and serializes with an injected document", () => {
    const doc = codec.parse("<p>injected</p>", manager.schema);

    expect(codec.serialize(doc)).toBe("<p>injected</p>");
  });

  it("constructs without a document and waits until use to throw", () => {
    const withoutDocument = new HtmlCodec({ extensions });

    expect(() => withoutDocument.parse("<p>x</p>", manager.schema)).toThrow(/DOM document/);
    expect(() =>
      withoutDocument.serialize(
        manager.schema.node("doc", null, [manager.schema.node("paragraph")]),
      ),
    ).toThrow(/DOM document/);
  });
});

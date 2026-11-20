import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createExtensionManager } from "../core/extension-manager";
import { starterKit } from "../extensions/index";
import { createEditor } from "../index";
import { createHtmlCodec } from "./codec";
import { document, extensions } from "./fixtures.test-utils";

const jsonDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "json" }],
    },
  ],
};

describe("editor HTML integration", () => {
  beforeEach(() => {
    vi.stubGlobal("document", document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an editor from HTML and serializes it back", () => {
    const editor = createEditor({
      extensions,
      content: "<h1>Hi</h1>",
      contentType: "html",
    });

    expect(editor.getHTML()).toBe("<h1>Hi</h1>");
    expect(() => editor.state.doc.check()).not.toThrow();
    editor.destroy();
  });

  it("uses the same codec as createHtmlCodec", () => {
    const editor = createEditor({
      extensions,
      content: "<p><strong>same</strong></p>",
      contentType: "html",
    });
    const manager = createExtensionManager(extensions);
    const codec = createHtmlCodec({
      extensions,
      document,
      schema: manager.schema,
    });

    expect(editor.getHTML()).toBe(codec.serialize(editor.state.doc));
    editor.destroy();
  });

  it("sets content as markdown, HTML and JSON", () => {
    const editor = createEditor({
      extensions,
      content: "# start",
      contentType: "markdown",
    });

    editor.setContent("<p><strong>html</strong></p>", "html");
    expect(editor.getHTML()).toBe("<p><strong>html</strong></p>");

    editor.setContent(JSON.stringify(jsonDoc), "json");
    expect(editor.state.doc.textContent).toBe("json");
    expect(JSON.parse(editor.getJSON())).toEqual(editor.state.doc.toJSON());

    editor.setContent("*markdown*", "markdown");
    expect(editor.getMarkdown()).toBe("*markdown*");
    editor.destroy();
  });

  it("converts markdown to HTML and HTML to markdown", () => {
    const fromMarkdown = createEditor({
      extensions,
      content: "# Hi **bold**",
      contentType: "markdown",
    });

    expect(fromMarkdown.getHTML()).toBe("<h1>Hi <strong>bold</strong></h1>");
    fromMarkdown.destroy();

    const fromHtml = createEditor({
      extensions,
      content: "<p><strong>a</strong></p>",
      contentType: "html",
    });

    expect(fromHtml.getMarkdown()).toBe("**a**");
    fromHtml.destroy();
  });

  it("reports a missing document when HTML is used without one", () => {
    vi.unstubAllGlobals();

    const editor = createEditor({
      extensions: starterKit(),
      content: "# x",
      contentType: "markdown",
    });

    expect(() => editor.getHTML()).toThrow(/DOM document/);
    editor.destroy();
  });
});

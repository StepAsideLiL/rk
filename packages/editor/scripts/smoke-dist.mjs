import { MarkdownCodec } from "@rk/editor";
import { PlaygroundKit, StarterKit } from "@rk/editor/extensions";
import { HtmlCodec } from "@rk/editor/html";
import { EditorRoot, useCurrentEditor, useEditor } from "@rk/editor/react";
import { createTestEditor } from "@rk/editor/testing";

const extensions = [StarterKit()];
const codec = new MarkdownCodec({ extensions });
const htmlCodec = new HtmlCodec({ extensions });
const editor = createTestEditor(extensions, "**built** package");

editor.state.doc.check();

if (editor.getMarkdown() !== "**built** package") {
  throw new Error("Built markdown round trip failed.");
}

if (
  typeof EditorRoot !== "function" ||
  typeof useEditor !== "function" ||
  typeof useCurrentEditor !== "function"
) {
  throw new Error("React entry did not export the editor root and hooks.");
}

const playground = createTestEditor([PlaygroundKit()], "**playground**");

playground.state.doc.check();

if (playground.getMarkdown() !== "**playground**") {
  throw new Error("PlaygroundKit markdown round trip failed.");
}

playground.destroy();

if (typeof codec.parse !== "function" || typeof codec.serialize !== "function") {
  throw new Error("Main entry did not export a markdown codec.");
}

if (typeof htmlCodec.parse !== "function" || typeof htmlCodec.serialize !== "function") {
  throw new Error("HTML entry did not export an HTML codec.");
}

editor.destroy();

console.log("dist smoke ok");

import { MarkdownCodec } from "@rk/editor";
import { starterKit } from "@rk/editor/extensions";
import { HtmlCodec } from "@rk/editor/html";
import { EditorProvider } from "@rk/editor/react";
import { createTestEditor } from "@rk/editor/testing";

const extensions = starterKit();
const codec = new MarkdownCodec({ extensions });
const htmlCodec = new HtmlCodec({ extensions });
const editor = createTestEditor(extensions, "**built** package");

editor.state.doc.check();

if (editor.getMarkdown() !== "**built** package") {
  throw new Error("Built markdown round trip failed.");
}

if (typeof EditorProvider !== "function") {
  throw new Error("React entry did not export EditorProvider.");
}

if (typeof codec.parse !== "function" || typeof codec.serialize !== "function") {
  throw new Error("Main entry did not export a markdown codec.");
}

if (typeof htmlCodec.parse !== "function" || typeof htmlCodec.serialize !== "function") {
  throw new Error("HTML entry did not export an HTML codec.");
}

editor.destroy();

console.log("dist smoke ok");

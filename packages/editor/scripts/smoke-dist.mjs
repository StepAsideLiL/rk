import { createMarkdownCodec } from "@rk/editor";
import { starterKit } from "@rk/editor/extensions";
import { EditorProvider } from "@rk/editor/react";
import { createTestEditor } from "@rk/editor/testing";

const extensions = starterKit();
const codec = createMarkdownCodec({ extensions });
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

editor.destroy();

console.log("dist smoke ok");

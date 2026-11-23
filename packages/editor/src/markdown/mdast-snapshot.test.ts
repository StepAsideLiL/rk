import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import { MarkdownCodec } from "./codec";
import { toMdastRoot } from "./convert";
import { testExtensions } from "./test/fixtures";

const manager = new ExtensionManager(testExtensions);
const schema = manager.schema;
const codec = new MarkdownCodec({ extensions: testExtensions });

describe("mdast snapshots", () => {
  it.each(["**a *b* c**", "**a***b*", "**a `b` c**"])(
    "snapshots the mdast produced for %s",
    (markdown) => {
      const doc = codec.parse(markdown, schema);
      const root = toMdastRoot(doc, manager.markdown, "throw");

      expect(root).toMatchSnapshot();
    },
  );
});

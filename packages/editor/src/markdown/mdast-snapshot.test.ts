import { describe, expect, it } from "vitest";

import { createExtensionManager } from "../core/extension-manager";
import { createMarkdownCodec } from "./codec";
import { toMdastRoot } from "./convert";
import { testExtensions } from "./fixtures.test-utils";

const manager = createExtensionManager(testExtensions);
const schema = manager.schema;
const codec = createMarkdownCodec({ extensions: testExtensions });

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

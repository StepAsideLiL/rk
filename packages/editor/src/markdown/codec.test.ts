import type { Extension } from "../core/types";
import { describe, expect, it } from "vitest";
import type { Plugin as UnifiedPlugin } from "unified";

import { ExtensionManager } from "../core/extension-manager";
import { MarkdownCodec, defaultUnknownNodeStrategy } from "./codec";
import { testExtensions } from "./test/fixtures";

const remarkPlugin = (() => undefined) as unknown as UnifiedPlugin;
const pluginExtension: Extension<unknown> = {
  name: "test-remark-plugin",
  markdown: { remarkPlugins: [remarkPlugin] },
};
const extensions = [...testExtensions, pluginExtension];
const manager = new ExtensionManager(extensions);
const codec = new MarkdownCodec({
  extensions,
  stringify: { bullet: "+" },
});

describe("MarkdownCodec", () => {
  it("runs remark plugins and forwards stringify options", () => {
    const doc = codec.parse("* item", manager.schema);

    expect(codec.serialize(doc)).toBe("+ item");
  });

  it("selects the default strategy by environment", () => {
    expect(defaultUnknownNodeStrategy(true)).toBe("throw");
    expect(defaultUnknownNodeStrategy(false)).toBe("preserve");
  });
});

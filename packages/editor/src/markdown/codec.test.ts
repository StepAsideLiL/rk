import type { Extension } from "../core/types";
import { describe, expect, it } from "vitest";
import type { Plugin as UnifiedPlugin } from "unified";

import { createExtensionManager } from "../core/extension-manager";
import { createMarkdownCodec, defaultUnknownNodeStrategy } from "./codec";
import { testExtensions } from "./fixtures.test-utils";

const remarkPlugin = (() => undefined) as unknown as UnifiedPlugin;
const pluginExtension: Extension<unknown> = {
  name: "test-remark-plugin",
  markdown: { remarkPlugins: [remarkPlugin] },
};
const extensions = [...testExtensions, pluginExtension];
const manager = createExtensionManager(extensions);
const codec = createMarkdownCodec({
  extensions,
  stringify: { bullet: "+" },
});

describe("createMarkdownCodec", () => {
  it("runs remark plugins and forwards stringify options", () => {
    const doc = codec.parse("* item", manager.schema);

    expect(codec.serialize(doc)).toBe("+ item");
  });

  it("selects the default strategy by environment", () => {
    expect(defaultUnknownNodeStrategy(true)).toBe("throw");
    expect(defaultUnknownNodeStrategy(false)).toBe("preserve");
  });
});

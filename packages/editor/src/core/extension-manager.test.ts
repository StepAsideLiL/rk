import { describe, expect, it, vi } from "vitest";
import type { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Plugin as UnifiedPlugin } from "unified";

import { createExtensionManager } from "./extension-manager";
import type { CommandRegistry, Extension, ExtensionContext } from "./types";

const documentExtension = (priority = 100): Extension<unknown> => ({
  name: "document",
  priority,
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
  },
});

const paragraphExtension = (priority = 0): Extension<unknown> => ({
  name: "paragraph",
  priority,
  nodes: {
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
  },
});

const headingExtension = (priority = 50): Extension<unknown> => ({
  name: "heading",
  priority,
  nodes: {
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
      toDOM: () => ["h1", 0],
    },
  },
});

const extension = (
  name: string,
  overrides: Partial<Extension<unknown>> = {},
): Extension<unknown> => ({ name, ...overrides });

const testContext = (schema: Schema): ExtensionContext => {
  const registry: CommandRegistry = {
    get: () => undefined,
    has: () => false,
    keys: () => [],
  };

  return {
    schema,
    getState: () => EditorState.create({ schema }),
    getView: () => undefined,
    commands: registry,
  };
};

describe("createExtensionManager", () => {
  it("rejects duplicate extension names", () => {
    expect(() =>
      createExtensionManager([documentExtension(), extension("bold"), extension("bold")]),
    ).toThrow('Duplicate extension name "bold"');
  });

  it("rejects missing requirements with both names in the message", () => {
    expect(() =>
      createExtensionManager([documentExtension(), extension("bold", { requires: ["italic"] })]),
    ).toThrow('Extension "bold" requires "italic", which is not installed.');
  });

  it("orders the default block by priority", () => {
    const paragraphFirst = createExtensionManager([
      documentExtension(),
      paragraphExtension(0),
      headingExtension(200),
    ]);
    const paragraphDoc = paragraphFirst.schema.topNodeType.createAndFill();
    expect(paragraphDoc?.firstChild?.type.name).toBe("paragraph");

    const headingFirst = createExtensionManager([
      documentExtension(),
      paragraphExtension(200),
      headingExtension(0),
    ]);
    const headingDoc = headingFirst.schema.topNodeType.createAndFill();
    expect(headingDoc?.firstChild?.type.name).toBe("heading");
  });

  it("merges nodes and marks from several extensions", () => {
    const manager = createExtensionManager([
      documentExtension(),
      paragraphExtension(),
      extension("strong", { marks: { strong: { toDOM: () => ["strong", 0] } } }),
    ]);

    expect(manager.schema.nodes.doc).toBeDefined();
    expect(manager.schema.nodes.paragraph).toBeDefined();
    expect(manager.schema.marks.strong).toBeDefined();
  });

  it("lets the higher-priority keymap binding win", () => {
    const high = vi.fn(() => true);
    const low = vi.fn(() => true);
    const manager = createExtensionManager([
      documentExtension(),
      paragraphExtension(),
      extension("low", { priority: 10, keymap: () => ({ Enter: low }) }),
      extension("high", { priority: 200, keymap: () => ({ Enter: high }) }),
    ]);

    const plugins = manager.createPlugins(testContext(manager.schema));
    const keymaps = plugins.filter((plugin) => typeof plugin.props.handleKeyDown === "function");
    expect(keymaps).toHaveLength(2);

    const state = EditorState.create({ schema: manager.schema });
    const view = { state, dispatch: vi.fn() } as unknown as EditorView;
    const event = {
      key: "Enter",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    const keymapPlugin = keymaps[0];
    expect(keymapPlugin?.props.handleKeyDown?.call(keymapPlugin, view, event)).toBe(true);
    expect(high).toHaveBeenCalledTimes(1);
    expect(low).not.toHaveBeenCalled();
  });

  it("collects markdown handlers and remark plugins in priority order", () => {
    const lowHandler = vi.fn(() => null);
    const highHandler = vi.fn(() => null);
    const remarkPlugin = (() => undefined) as unknown as UnifiedPlugin;
    const manager = createExtensionManager([
      documentExtension(),
      paragraphExtension(),
      extension("low", {
        priority: 10,
        markdown: { fromMdast: { heading: lowHandler } },
      }),
      extension("high", {
        priority: 200,
        markdown: {
          fromMdast: { heading: highHandler },
          remarkPlugins: [remarkPlugin],
        },
      }),
    ]);

    expect(manager.markdown.fromMdast.heading).toBe(highHandler);
    expect(manager.markdown.remarkPlugins).toEqual([remarkPlugin]);
  });
});

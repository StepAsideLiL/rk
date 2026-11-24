import { describe, expect, it, vi } from "vitest";
import { InputRule } from "prosemirror-inputrules";
import type { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Plugin as UnifiedPlugin } from "unified";

import { ExtensionManager } from "./extension-manager";
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

describe("ExtensionManager", () => {
  it("rejects duplicate extension names", () => {
    expect(
      () => new ExtensionManager([documentExtension(), extension("bold"), extension("bold")]),
    ).toThrow('Duplicate extension name "bold"');
  });

  it("rejects missing requirements with both names in the message", () => {
    expect(
      () =>
        new ExtensionManager([documentExtension(), extension("bold", { requires: ["italic"] })]),
    ).toThrow('Extension "bold" requires "italic", which is not installed.');
  });

  it("rejects schemas without a doc node", () => {
    expect(
      () =>
        new ExtensionManager([
          extension("paragraph", {
            nodes: { paragraph: { group: "block", content: "inline*" } },
          }),
        ]),
    ).toThrow(/missing a "doc" node/);
  });

  it("lets the earlier extension win inside one priority tier", () => {
    const first = vi.fn(() => true);
    const second = vi.fn(() => true);
    const manager = new ExtensionManager([
      documentExtension(),
      paragraphExtension(),
      extension("first", { priority: 5, keymap: () => ({ Enter: first }) }),
      extension("second", { priority: 5, keymap: () => ({ Enter: second }) }),
    ]);
    const plugins = manager.createPlugins(testContext(manager.schema));
    const keymapPlugin = plugins.find((plugin) => typeof plugin.props.handleKeyDown === "function");
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

    expect(keymapPlugin?.props.handleKeyDown?.call(keymapPlugin, view, event)).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("orders the default block by priority", () => {
    const paragraphFirst = new ExtensionManager([
      documentExtension(),
      paragraphExtension(0),
      headingExtension(200),
    ]);
    const paragraphDoc = paragraphFirst.schema.topNodeType.createAndFill();
    expect(paragraphDoc?.firstChild?.type.name).toBe("paragraph");

    const headingFirst = new ExtensionManager([
      documentExtension(),
      paragraphExtension(200),
      headingExtension(0),
    ]);
    const headingDoc = headingFirst.schema.topNodeType.createAndFill();
    expect(headingDoc?.firstChild?.type.name).toBe("heading");
  });

  it("merges nodes and marks from several extensions", () => {
    const manager = new ExtensionManager([
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
    const manager = new ExtensionManager([
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

  it("expands nested bundles into a flat extension list", () => {
    const bundle = extension("bundle", {
      extensions: [
        documentExtension(),
        extension("nested", { extensions: [paragraphExtension()] }),
      ],
    });
    const manager = new ExtensionManager([bundle]);

    expect(manager.extensions.map((candidate) => candidate.name)).toEqual([
      "paragraph",
      "document",
    ]);
    expect(manager.schema.nodes.doc).toBeDefined();
    expect(manager.schema.nodes.paragraph).toBeDefined();
  });

  it("rejects duplicates introduced by a bundle", () => {
    const bundle = extension("bundle", {
      extensions: [documentExtension(), paragraphExtension()],
    });

    expect(() => new ExtensionManager([bundle, paragraphExtension()])).toThrow(
      'Duplicate extension name "paragraph"',
    );
  });

  it("rejects bundles that also declare behavior", () => {
    const bundle = extension("bundle", {
      extensions: [documentExtension()],
      nodes: { extra: { group: "block" } },
    });

    expect(() => new ExtensionManager([bundle])).toThrow(/Bundles may only declare/);
  });

  it("rejects circular bundles", () => {
    const bundle: { name: string; extensions: Extension<unknown>[] } = {
      name: "bundle",
      extensions: [],
    };

    bundle.extensions.push(bundle);

    expect(() => new ExtensionManager([bundle])).toThrow(/Circular extension bundle/);
  });

  it("validates requirements across bundle boundaries", () => {
    const bundle = extension("bundle", {
      extensions: [documentExtension(), extension("bold", { requires: ["italic"] })],
    });

    expect(() => new ExtensionManager([bundle])).toThrow('Extension "bold" requires "italic"');
  });

  it("builds the schema from a provided spec", () => {
    const manager = new ExtensionManager([documentExtension(), paragraphExtension()], {
      schemaSpec: {
        nodes: {
          doc: { content: "block+" },
          paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
          text: { group: "inline" },
        },
      },
    });

    expect(manager.schema.nodes.doc).toBeDefined();
    expect(manager.schema.nodes.paragraph).toBeDefined();
    expect(manager.schema.nodes.text).toBeDefined();
  });

  it("builds the schema from a spec with marks", () => {
    const strong = extension("strong", {
      marks: { strong: { toDOM: () => ["strong", 0] } },
    });
    const manager = new ExtensionManager([documentExtension(), paragraphExtension(), strong], {
      schemaSpec: {
        nodes: {
          doc: { content: "block+" },
          paragraph: { group: "block", content: "inline*" },
          text: { group: "inline" },
        },
        marks: { strong: {} },
      },
    });

    expect(manager.schema.marks.strong).toBeDefined();
  });

  it("rejects a spec mark without a matching extension", () => {
    expect(
      () =>
        new ExtensionManager([documentExtension(), paragraphExtension()], {
          schemaSpec: {
            nodes: {
              doc: { content: "block+" },
              paragraph: { group: "block", content: "inline*" },
              text: { group: "inline" },
            },
            marks: { strong: {} },
          },
        }),
    ).toThrow(/has no matching extension mark/);
  });

  it("rejects an extension mark missing from the spec", () => {
    const strong = extension("strong", {
      marks: { strong: { toDOM: () => ["strong", 0] } },
    });

    expect(
      () =>
        new ExtensionManager([documentExtension(), paragraphExtension(), strong], {
          schemaSpec: {
            nodes: {
              doc: { content: "block+" },
              paragraph: { group: "block", content: "inline*" },
              text: { group: "inline" },
            },
          },
        }),
    ).toThrow(/is missing from the schema spec/);
  });

  it("rejects a spec node without a matching extension", () => {
    expect(
      () =>
        new ExtensionManager([documentExtension(), paragraphExtension()], {
          schemaSpec: {
            nodes: {
              doc: { content: "block+" },
              paragraph: { group: "block", content: "inline*" },
              text: { group: "inline" },
              extra: { group: "block", content: "inline*" },
            },
          },
        }),
    ).toThrow(/has no matching extension node/);
  });

  it("rejects an extension node missing from the spec", () => {
    const extra = extension("extra", {
      nodes: { extra: { group: "block", content: "inline*" } },
    });

    expect(
      () =>
        new ExtensionManager([documentExtension(), paragraphExtension(), extra], {
          schemaSpec: {
            nodes: {
              doc: { content: "block+" },
              paragraph: { group: "block", content: "inline*" },
              text: { group: "inline" },
            },
          },
        }),
    ).toThrow(/is missing from the schema spec/);
  });

  it("can disable or filter input rules", () => {
    const rule = new InputRule(/x$/, (state, _match, start, end) => state.tr.delete(start, end));
    const inputRules = vi.fn(() => [rule]);
    const ruleExtension = extension("rules", { inputRules });
    const manager = new ExtensionManager([
      documentExtension(),
      paragraphExtension(),
      ruleExtension,
    ]);
    const context = testContext(manager.schema);

    expect(manager.createPlugins(context).some(hasTextInput)).toBe(true);
    expect(inputRules).toHaveBeenCalledTimes(1);

    inputRules.mockClear();

    expect(manager.createPlugins(context, { inputRules: false }).some(hasTextInput)).toBe(false);
    expect(inputRules).not.toHaveBeenCalled();

    manager.createPlugins(context, { inputRules: ["other"] });
    expect(inputRules).not.toHaveBeenCalled();

    manager.createPlugins(context, { inputRules: ["rules"] });
    expect(inputRules).toHaveBeenCalledTimes(1);

    inputRules.mockClear();

    manager.createPlugins(context, { inputRules: [ruleExtension] });
    expect(inputRules).toHaveBeenCalledTimes(1);
  });

  it("collects markdown handlers and remark plugins in priority order", () => {
    const lowHandler = vi.fn(() => null);
    const highHandler = vi.fn(() => null);
    const remarkPlugin = (() => undefined) as unknown as UnifiedPlugin;
    const manager = new ExtensionManager([
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

function hasTextInput(plugin: { props: { handleTextInput?: unknown } }): boolean {
  return typeof plugin.props.handleTextInput === "function";
}

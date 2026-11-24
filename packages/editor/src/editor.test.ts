import { describe, expect, it, vi } from "vitest";
import { InputRule } from "prosemirror-inputrules";
import { Plugin, PluginKey, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { CONTROLLED_UPDATE_META, Editor } from "./editor";
import { withCommand } from "./core/test/fixtures";
import type { Command, ContentCodec, Extension } from "./core/types";

const strongExtension: Extension<unknown> = {
  name: "strong",
  marks: {
    strong: { toDOM: () => ["strong", 0] },
  },
};

const breakExtension: Extension<unknown> = {
  name: "break",
  nodes: {
    break: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
  },
};

const headingExtension: Extension<unknown> = {
  name: "heading",
  nodes: {
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
  },
};

const inputRuleExtension: Extension<unknown> = {
  name: "input-rule",
  inputRules: () => [
    new InputRule(/\s$/, (state, _match, start, end) => state.tr.insertText("!", start, end)),
  ],
};

describe("Editor", () => {
  it("runs commands without a view and never dispatches from can", () => {
    const dispatchSpy = vi.fn();
    const seenViews: Array<EditorView | undefined> = [];
    const command: Command = (state, dispatch, view) => {
      seenViews.push(view);

      if (!dispatch) {
        return false;
      }

      dispatchSpy();
      dispatch(state.tr.insertText("x"));
      return true;
    };

    const editor = new Editor({ extensions: withCommand(command) });

    expect(editor.view).toBeUndefined();
    expect(editor.can.testCommand()).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(seenViews).toEqual([undefined]);

    expect(editor.commands.testCommand()).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(seenViews).toEqual([undefined, undefined]);
    expect(editor.state.doc.textContent).toBe("x");
  });

  it("emits transaction before update", () => {
    const events: string[] = [];
    const command: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return true;
    };
    const editor = new Editor({ extensions: withCommand(command) });

    editor.on("transaction", () => events.push("transaction"));
    editor.on("update", () => events.push("update"));

    expect(editor.commands.testCommand()).toBe(true);
    expect(events).toEqual(["transaction", "update"]);
  });

  it("does not share plugin state between editors", () => {
    const counterKey = new PluginKey<number>("counter");
    const counter = new Plugin({
      key: counterKey,
      state: {
        init: () => 0,
        apply: (transaction, value) => (transaction.docChanged ? value + 1 : value),
      },
    });
    const command: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return true;
    };
    const extensions = withCommand(command, [counter]);
    const first = new Editor({ extensions });
    const second = new Editor({ extensions });

    expect(first.state).not.toBe(second.state);
    expect(counterKey.getState(first.state)).toBe(0);
    expect(counterKey.getState(second.state)).toBe(0);

    expect(first.commands.testCommand()).toBe(true);
    expect(counterKey.getState(first.state)).toBe(1);
    expect(counterKey.getState(second.state)).toBe(0);
  });

  it("destroys once and stops emitting", () => {
    const command: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return true;
    };
    const editor = new Editor({ extensions: withCommand(command) });
    const updates = vi.fn();
    const destroys = vi.fn();

    editor.on("update", updates);
    editor.on("destroy", destroys);
    expect(editor.commands.testCommand()).toBe(true);

    editor.destroy();
    editor.destroy();

    expect(editor.commands.testCommand()).toBe(false);
    expect(updates).toHaveBeenCalledTimes(1);
    expect(destroys).toHaveBeenCalledTimes(1);
    expect(editor.view).toBeUndefined();
  });

  it("stops calling unsubscribed listeners", () => {
    const command: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return true;
    };
    const editor = new Editor({ extensions: withCommand(command) });
    const updates = vi.fn();
    const unsubscribe = editor.on("update", updates);

    unsubscribe();
    expect(editor.commands.testCommand()).toBe(true);
    expect(updates).not.toHaveBeenCalled();
  });

  it("parses JSON string content", () => {
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "json" }],
          },
        ],
      }),
    });

    expect(editor.state.doc.textContent).toBe("json");
  });

  it("sets content with the controlled-update meta and skips no-ops", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });
    const metas: unknown[] = [];

    editor.on("transaction", (transaction) => {
      metas.push(transaction.getMeta(CONTROLLED_UPDATE_META));
    });

    const next = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "next" }] }],
    };

    editor.setContent(next);
    expect(editor.state.doc.textContent).toBe("next");
    expect(metas).toEqual([true]);

    editor.setContent(next);
    expect(metas).toHaveLength(1);
  });

  it("ignores content, dispatch and view creation after destroy", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    editor.destroy();
    editor.setContent({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "ignored" }] }],
    });
    editor.dispatch(editor.state.tr.insertText("ignored"));

    expect(editor.state.doc.textContent).toBe("");
    expect(() => editor.createView({} as HTMLElement)).toThrow(/destroyed/);
  });

  it("rejects non-string markdown content when a codec is present", () => {
    const codec: ContentCodec = {
      parse: () => {
        throw new Error("should not parse");
      },
      serialize: () => "",
    };

    expect(
      () =>
        new Editor({
          extensions: withCommand(() => true),
          content: {},
          contentType: "markdown",
          markdown: codec,
        }),
    ).toThrow(/string content/);
  });

  it("uses an injected HTML codec for content and getHTML", () => {
    const html: ContentCodec = {
      parse(content, schema) {
        return schema.node("doc", null, [schema.node("paragraph", null, [schema.text(content)])]);
      },
      serialize(doc) {
        return `<p>${doc.textContent}</p>`;
      },
    };
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: "html",
      contentType: "html",
      codecs: { html },
    });

    expect(editor.getHTML()).toBe("<p>html</p>");
    editor.setContent("next", "html");
    expect(editor.getHTML()).toBe("<p>next</p>");
  });

  it("uses a default HTML codec that needs a DOM document", () => {
    expect(
      () =>
        new Editor({
          extensions: withCommand(() => true),
          content: "<p>x</p>",
          contentType: "html",
        }),
    ).toThrow(/DOM document/);

    const editor = new Editor({ extensions: withCommand(() => true) });

    expect(() => editor.getHTML()).toThrow(/DOM document/);
    editor.destroy();
  });

  it("serializes the document to JSON", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    expect(editor.getJSON()).toBe(JSON.stringify(editor.state.doc.toJSON()));
  });

  it("accepts a ProseMirror node as content", () => {
    const source = new Editor({ extensions: withCommand(() => true) });
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: source.state.doc,
    });

    expect(editor.state.doc.eq(source.state.doc)).toBe(true);
  });

  it("exposes the command registry during extension setup", () => {
    const reads: unknown[] = [];
    const extension: Extension<unknown> = {
      name: "registry-reader",
      commands(context) {
        reads.push(
          context.commands.get("testCommand"),
          context.commands.has("testCommand"),
          context.commands.keys(),
        );
        return {};
      },
    };

    new Editor({
      extensions: [...withCommand(() => true), extension],
    });

    expect(reads).toEqual([undefined, false, []]);
  });

  it("exposes the view but not the state during extension setup", () => {
    let view: unknown;
    let stateError: unknown;
    const extension: Extension<unknown> = {
      name: "setup-reader",
      commands(context) {
        view = context.getView();

        try {
          context.getState();
        } catch (error) {
          stateError = error;
        }

        return {};
      },
    };

    new Editor({
      extensions: [...withCommand(() => true), extension],
    });

    expect(view).toBeUndefined();
    expect(stateError).toMatchObject({
      message: "Editor state is not available during extension setup.",
    });
  });

  it("uses a provided schema spec", () => {
    const editor = new Editor({
      extensions: withCommand(() => true),
      schemaSpec: {
        nodes: {
          doc: { content: "block+" },
          paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
          text: { group: "inline" },
        },
      },
    });

    expect(editor.schema.nodes.paragraph).toBeDefined();
    expect(editor.schema.nodes.text).toBeDefined();
  });

  it("serializes the document to plain text", () => {
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "one" }] },
          { type: "paragraph", content: [{ type: "text", text: "two" }] },
        ],
      },
    });

    expect(editor.getText()).toBe("one\n\ntwo");
    expect(editor.getText({ blockSeparator: "\n" })).toBe("one\ntwo");
  });

  it("serializes leaf nodes with text serializers", () => {
    const editor = new Editor({
      extensions: [...withCommand(() => true), breakExtension],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "a" }, { type: "break" }, { type: "text", text: "b" }],
          },
        ],
      },
    });

    expect(editor.getText()).toBe("ab");
    expect(editor.getText({ textSerializers: { break: () => "\n" } })).toBe("a\nb");
    expect(editor.getText({ textSerializers: { break: () => false } })).toBe("ab");
  });

  it("returns empty results for unknown node and mark types", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    expect(editor.getAttributes("missing")).toEqual({});
    expect(editor.isActive("missing")).toBe(false);
  });

  it("reports empty, editable, focused and destroyed state", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    expect(editor.isEmpty).toBe(true);
    expect(editor.isEditable).toBe(true);
    expect(editor.isFocused).toBe(false);
    expect(editor.isDestroyed).toBe(false);

    editor.destroy();

    expect(editor.isDestroyed).toBe(true);
  });

  it("changes editable state and emits an update", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });
    const updates = vi.fn();

    editor.on("update", updates);

    editor.setEditable(false, false);
    expect(editor.isEditable).toBe(false);
    expect(updates).not.toHaveBeenCalled();

    editor.setEditable(true);
    editor.setEditable(true);

    expect(editor.isEditable).toBe(true);
    expect(updates).toHaveBeenCalledTimes(1);
  });

  it("detects active marks and reads their attributes", () => {
    const editor = new Editor({
      extensions: [...withCommand(() => true), strongExtension],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "hi", marks: [{ type: "strong" }] },
              { type: "text", text: " there" },
            ],
          },
        ],
      },
    });

    select(editor, 1, 2);

    expect(editor.isActive("strong")).toBe(true);
    expect(editor.isActive({})).toBe(true);
    expect(editor.getAttributes("strong")).toEqual({});

    const strong = editor.schema.marks.strong;

    if (strong) {
      expect(editor.isActive(strong)).toBe(true);
      expect(editor.getAttributes(strong)).toEqual({});
    }

    select(editor, 4, 8);

    expect(editor.isActive("strong")).toBe(false);
    expect(editor.getAttributes("strong")).toEqual({});

    select(editor, 2, 2);

    expect(editor.isActive("strong")).toBe(true);
  });

  it("deduplicates marks across text nodes", () => {
    const editor = new Editor({
      extensions: [...withCommand(() => true), strongExtension],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "a", marks: [{ type: "strong" }] },
              { type: "text", text: "x" },
              { type: "text", text: "b", marks: [{ type: "strong" }] },
            ],
          },
        ],
      },
    });

    select(editor, 1, 4);

    expect(editor.isActive("strong")).toBe(true);
    expect(editor.isActive({})).toBe(true);
  });

  it("detects active nodes and matches attributes", () => {
    const editor = new Editor({
      extensions: [...withCommand(() => true), headingExtension],
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "hi" }],
          },
        ],
      },
    });

    select(editor, 1, 2);

    expect(editor.isActive("heading")).toBe(true);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);
    expect(editor.isActive("heading", { level: 1 })).toBe(false);
    expect(editor.isActive({ level: 2 })).toBe(true);
    expect(editor.getAttributes("heading")).toEqual({ level: 2 });
    expect(editor.getAttributes("paragraph")).toEqual({});

    const heading = editor.schema.nodes.heading;

    if (heading) {
      expect(editor.isActive(heading, { level: 2 })).toBe(true);
    }
  });

  it("handles a selection at the end of the document", () => {
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }],
      },
    });

    editor.dispatch(editor.state.tr.setSelection(Selection.atEnd(editor.state.doc)));

    expect(editor.isActive("paragraph")).toBe(true);
  });

  it("matches nodes when the selection spans blocks", () => {
    const editor = new Editor({
      extensions: withCommand(() => true),
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "a" }] },
          { type: "paragraph", content: [{ type: "text", text: "b" }] },
        ],
      },
    });

    editor.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, 1, editor.state.doc.content.size - 1),
      ),
    );

    expect(editor.isActive("paragraph")).toBe(true);
  });

  it("registers and unregisters plugins by key and name", () => {
    const key = new PluginKey<number>("extra");
    const plugin = new Plugin({
      key,
      state: {
        init: () => 0,
        apply: (_transaction, value) => value,
      },
    });
    const editor = new Editor({ extensions: withCommand(() => true) });

    expect(key.getState(editor.state)).toBeUndefined();

    editor.registerPlugin(plugin);
    expect(key.getState(editor.state)).toBe(0);

    editor.unregisterPlugin(key);
    expect(key.getState(editor.state)).toBeUndefined();

    editor.registerPlugin(plugin);
    editor.unregisterPlugin("extra");
    expect(key.getState(editor.state)).toBeUndefined();
  });

  it("merges plugins through the registerPlugin handler", () => {
    const key = new PluginKey<number>("merged");
    const plugin = new Plugin({
      key,
      state: {
        init: () => 1,
        apply: (_transaction, value) => value,
      },
    });
    const editor = new Editor({ extensions: withCommand(() => true) });

    editor.registerPlugin(plugin, (newPlugin, plugins) => [newPlugin, ...plugins]);

    expect(editor.state.plugins[0]).toBe(plugin);
  });

  it("runs chained commands on the same operation", () => {
    const insertX: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return true;
    };
    const editor = new Editor({ extensions: withCommand(insertX) });
    const updates = vi.fn();

    editor.on("update", updates);

    expect(editor.chain().testCommand().testCommand().run()).toBe(true);
    expect(editor.state.doc.textContent).toBe("xx");
    expect(updates).toHaveBeenCalledTimes(2);
  });

  it("does not commit a failing command chain", () => {
    const command: Command = (state, dispatch) => {
      if (!dispatch) {
        return false;
      }

      dispatch(state.tr.insertText("x"));
      return false;
    };
    const editor = new Editor({ extensions: withCommand(command) });

    expect(editor.chain().testCommand().run()).toBe(false);
    expect(editor.state.doc.textContent).toBe("");
  });

  it("updates runtime options through setOptions", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    editor.setOptions({ editable: false });

    expect(editor.isEditable).toBe(false);
  });

  it("updates codecs and content through setOptions", () => {
    const json: ContentCodec = {
      parse: (content, schema) => schema.nodeFromJSON(JSON.parse(content)),
      serialize: () => "custom",
    };
    const editor = new Editor({ extensions: withCommand(() => true) });

    editor.setOptions({ codecs: { json } });
    expect(editor.getJSON()).toBe("custom");

    editor.setOptions({
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "next" }] }],
      },
    });
    expect(editor.state.doc.textContent).toBe("next");
  });

  it("ignores option and plugin changes after destroy", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });

    editor.destroy();
    editor.setOptions({ editable: false });
    editor.registerPlugin(new Plugin({}));
    editor.unregisterPlugin("missing");

    expect(editor.isEditable).toBe(true);
    expect(editor.chain().testCommand().run()).toBe(false);
  });

  it("ignores unknown chain commands", () => {
    const editor = new Editor({ extensions: withCommand(() => true) });
    const chain = editor.chain() as unknown as Readonly<Record<string, unknown>>;

    expect(chain.missing).toBeUndefined();
  });

  it("enables and disables input rules", () => {
    const enabled = new Editor({
      extensions: [...withCommand(() => true), inputRuleExtension],
    });
    const disabled = new Editor({
      extensions: [...withCommand(() => true), inputRuleExtension],
      enableInputRules: false,
    });

    expect(hasInputRules(enabled)).toBe(true);
    expect(hasInputRules(disabled)).toBe(false);
  });

  it("runs without a DOM", () => {
    expect("window" in globalThis).toBe(false);
  });
});

function select(editor: Editor, from: number, to: number): void {
  editor.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
}

function hasInputRules(editor: Editor): boolean {
  return editor.state.plugins.some((plugin) => typeof plugin.props.handleTextInput === "function");
}

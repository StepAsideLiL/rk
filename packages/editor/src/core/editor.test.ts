import { describe, expect, it, vi } from "vitest";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { CONTROLLED_UPDATE_META, EditorCore } from "./editor";
import type { Command, ContentCodec, Extension } from "./types";

declare module "./types" {
  interface Commands {
    testCommand: Command;
  }
}

const documentExtension: Extension<unknown> = {
  name: "document",
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
  },
};

const paragraphExtension: Extension<unknown> = {
  name: "paragraph",
  priority: 0,
  nodes: {
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
  },
};

const withCommand = (command: Command, extraPlugins: Plugin[] = []): Extension<unknown>[] => [
  documentExtension,
  paragraphExtension,
  { name: "command", commands: () => ({ testCommand: command }) },
  { name: "extra", plugins: () => extraPlugins },
];

describe("EditorCore", () => {
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

    const editor = new EditorCore({ extensions: withCommand(command) });

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
    const editor = new EditorCore({ extensions: withCommand(command) });

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
    const first = new EditorCore({ extensions });
    const second = new EditorCore({ extensions });

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
    const editor = new EditorCore({ extensions: withCommand(command) });
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
    const editor = new EditorCore({ extensions: withCommand(command) });
    const updates = vi.fn();
    const unsubscribe = editor.on("update", updates);

    unsubscribe();
    expect(editor.commands.testCommand()).toBe(true);
    expect(updates).not.toHaveBeenCalled();
  });

  it("parses JSON string content", () => {
    const editor = new EditorCore({
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
    const editor = new EditorCore({ extensions: withCommand(() => true) });
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
    const editor = new EditorCore({ extensions: withCommand(() => true) });

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
        new EditorCore({
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
    const editor = new EditorCore({
      extensions: withCommand(() => true),
      content: "html",
      contentType: "html",
      codecs: { html },
    });

    expect(editor.getHTML()).toBe("<p>html</p>");
    editor.setContent("next", "html");
    expect(editor.getHTML()).toBe("<p>next</p>");
  });

  it("requires a codec for HTML content and getHTML", () => {
    expect(
      () =>
        new EditorCore({
          extensions: withCommand(() => true),
          content: "<p>x</p>",
          contentType: "html",
        }),
    ).toThrow(/html codec/);

    const editor = new EditorCore({ extensions: withCommand(() => true) });
    expect(() => editor.getHTML()).toThrow(/html codec/);
  });

  it("serializes the document to JSON", () => {
    const editor = new EditorCore({ extensions: withCommand(() => true) });

    expect(editor.getJSON()).toBe(JSON.stringify(editor.state.doc.toJSON()));
  });

  it("accepts a ProseMirror node as content", () => {
    const source = new EditorCore({ extensions: withCommand(() => true) });
    const editor = new EditorCore({
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

    new EditorCore({
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

    new EditorCore({
      extensions: [...withCommand(() => true), extension],
    });

    expect(view).toBeUndefined();
    expect(stateError).toMatchObject({
      message: "Editor state is not available during extension setup.",
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { createEditor } from "./create-editor";
import type { Command, Extension } from "./types";

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

describe("createEditor", () => {
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

    const editor = createEditor({ extensions: withCommand(command) });

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
    const editor = createEditor({ extensions: withCommand(command) });

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
    const first = createEditor({ extensions });
    const second = createEditor({ extensions });

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
    const editor = createEditor({ extensions: withCommand(command) });
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
    const editor = createEditor({ extensions: withCommand(command) });
    const updates = vi.fn();
    const unsubscribe = editor.on("update", updates);

    unsubscribe();
    expect(editor.commands.testCommand()).toBe(true);
    expect(updates).not.toHaveBeenCalled();
  });
});

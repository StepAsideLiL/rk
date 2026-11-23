import { describe, expect, it, vi } from "vitest";
import { Plugin } from "prosemirror-state";

import { EditorCore } from "./editor";
import { withCommand } from "./test/fixtures";
import type { Command } from "./types";

const insertText: Command = (state, dispatch) => {
  if (!dispatch) {
    return false;
  }

  dispatch(state.tr.insertText("x"));
  return true;
};

describe("EditorCore with an element", () => {
  it("mounts the view, routes view transactions and destroys plugin views", () => {
    const pluginDestroy = vi.fn();
    const plugin = new Plugin({ view: () => ({ destroy: pluginDestroy }) });
    const element = document.createElement("div");
    const editor = new EditorCore({
      extensions: withCommand(insertText, [plugin]),
      element,
    });

    expect(editor.view?.dom.parentElement).toBe(element);

    const updates = vi.fn();
    editor.on("update", updates);
    editor.view?.dispatch(editor.state.tr.insertText("y"));
    expect(updates).toHaveBeenCalledTimes(1);
    expect(editor.state.doc.textContent).toBe("y");

    const onDestroy = vi.fn();
    editor.on("destroy", onDestroy);

    editor.destroy();
    editor.destroy();

    expect(pluginDestroy).toHaveBeenCalledTimes(1);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(editor.view).toBeUndefined();
  });
});

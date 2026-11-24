import { describe, expect, it, vi } from "vitest";
import { AllSelection, Plugin } from "prosemirror-state";

import { Editor } from "./editor";
import { withCommand } from "./core/test/fixtures";
import type { Command } from "./core/types";

const insertText: Command = (state, dispatch) => {
  if (!dispatch) {
    return false;
  }

  dispatch(state.tr.insertText("x"));
  return true;
};

describe("Editor with an element", () => {
  it("mounts the view, routes view transactions and destroys plugin views", () => {
    const pluginDestroy = vi.fn();
    const plugin = new Plugin({ view: () => ({ destroy: pluginDestroy }) });
    const element = document.createElement("div");
    const editor = new Editor({
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

  it("mounts, unmounts and remounts headless editors", () => {
    const editor = new Editor({ extensions: withCommand(insertText) });
    const first = document.createElement("div");
    const second = document.createElement("div");

    expect(editor.view).toBeUndefined();

    editor.mount(first);
    expect(editor.view?.dom.parentElement).toBe(first);

    editor.unmount();
    expect(editor.view).toBeUndefined();

    editor.mount(second);
    expect(editor.view?.dom.parentElement).toBe(second);

    editor.destroy();
  });

  it("applies editor props, direction, tabindex and editable state", () => {
    const element = document.createElement("div");
    const editor = new Editor({
      extensions: withCommand(insertText),
      element,
      editable: false,
      textDirection: "rtl",
      editorProps: { attributes: { class: "prose" } },
      coreExtensionOptions: { tabindex: { value: "-1" } },
    });

    expect(editor.view?.dom.getAttribute("dir")).toBe("rtl");
    expect(editor.view?.dom.getAttribute("class")).toContain("prose");
    expect(editor.view?.dom.getAttribute("tabindex")).toBe("-1");
    expect(editor.view?.dom.getAttribute("contenteditable")).toBe("false");
    expect(editor.isEditable).toBe(false);

    editor.setEditable(true);

    expect(editor.view?.dom.getAttribute("contenteditable")).toBe("true");

    editor.destroy();
  });

  it("defaults tabindex for editable editors", () => {
    const element = document.createElement("div");
    const editor = new Editor({
      extensions: withCommand(insertText),
      element,
    });

    expect(editor.view?.dom.getAttribute("tabindex")).toBe("0");

    editor.setEditable(false);

    expect(editor.view?.dom.hasAttribute("tabindex")).toBe(false);

    editor.destroy();
  });

  it("updates view props through setOptions", () => {
    const element = document.createElement("div");
    const editor = new Editor({
      extensions: withCommand(insertText),
      element,
    });

    editor.setOptions({
      textDirection: "ltr",
      editorProps: {
        attributes: (state) => ({ "data-text": state.doc.textContent }),
      },
    });

    expect(editor.view?.dom.getAttribute("dir")).toBe("ltr");
    expect(editor.view?.dom.getAttribute("data-text")).toBe("");

    editor.destroy();
  });

  it("applies autofocus to the selection", () => {
    const element = document.createElement("div");

    document.body.append(element);

    const editor = new Editor({
      extensions: withCommand(insertText),
      element,
      content: paragraphContent("abc"),
      autofocus: "end",
    });

    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(editor.state.doc.content.size - 1);
    expect(editor.view?.hasFocus()).toBe(true);

    editor.destroy();
    element.remove();
  });

  it("supports start, all, numeric and boolean autofocus", () => {
    const start = new Editor({
      extensions: withCommand(insertText),
      element: document.createElement("div"),
      content: paragraphContent("abc"),
      autofocus: "start",
    });

    expect(start.state.selection.from).toBe(1);
    start.destroy();

    const all = new Editor({
      extensions: withCommand(insertText),
      element: document.createElement("div"),
      content: paragraphContent("abc"),
      autofocus: "all",
    });

    expect(all.state.selection).toBeInstanceOf(AllSelection);
    all.destroy();

    const position = new Editor({
      extensions: withCommand(insertText),
      element: document.createElement("div"),
      content: paragraphContent("abc"),
      autofocus: 2,
    });

    expect(position.state.selection.from).toBe(2);
    position.destroy();

    const enabled = new Editor({
      extensions: withCommand(insertText),
      element: document.createElement("div"),
      content: paragraphContent("abc"),
      autofocus: true,
    });

    expect(enabled.state.selection.from).toBe(1);
    enabled.destroy();
  });

  it("keeps routing view transactions after setOptions", () => {
    const element = document.createElement("div");
    const editor = new Editor({ extensions: withCommand(insertText), element });

    editor.setOptions({ editable: false });
    editor.view?.dispatch(editor.state.tr.insertText("z"));

    expect(editor.state.doc.textContent).toBe("z");

    editor.destroy();
  });
});

/** Minimal paragraph document used by autofocus tests. */
function paragraphContent(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

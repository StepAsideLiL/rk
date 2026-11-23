import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { afterEach, describe, expect, it } from "vitest";

import { EditorCore } from "../../core/editor";
import { ExtensionManager } from "../../core/extension-manager";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Selection } from "./selection";

const extensions = () => [Document(), Text(), Paragraph(), Selection()];

const editors: EditorCore[] = [];

const mount = (): EditorView => {
  const schema = new ExtensionManager(extensions()).schema;
  const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("alpha beta"))]);
  const element = document.createElement("div");

  document.body.append(element);

  const editor = new EditorCore({ extensions: extensions(), content: doc, element });

  editors.push(editor);

  const view = editor.view;

  if (!view) {
    throw new Error("Editor view was not mounted.");
  }

  view.focus();
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));

  return view;
};

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }

  document.body.innerHTML = "";
});

describe("Selection DOM", () => {
  it("paints the last selection with a dim background after blur", () => {
    const view = mount();

    expect(view.dom.querySelector(".rk-selection-inactive")).toBeNull();

    view.dom.blur();

    const decoration = view.dom.querySelector<HTMLElement>(".rk-selection-inactive");

    expect(decoration).not.toBeNull();
    expect(decoration?.textContent).toBe("alpha");
    expect(decoration?.getAttribute("style")).toContain("background-color");
    expect(decoration?.getAttribute("style")).toContain("--rk-selection-inactive-bg");

    view.focus();

    expect(view.dom.querySelector(".rk-selection-inactive")).toBeNull();
  });

  it("dims the selection while the window is inactive", () => {
    const view = mount();

    window.dispatchEvent(new Event("blur"));

    expect(view.dom.querySelector(".rk-selection-inactive")).not.toBeNull();

    window.dispatchEvent(new Event("focus"));

    expect(view.dom.querySelector(".rk-selection-inactive")).toBeNull();
  });
});

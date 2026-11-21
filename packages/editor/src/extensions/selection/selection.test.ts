import { AllSelection, NodeSelection, TextSelection } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { createEditor, type Editor } from "../../core/create-editor";
import { createExtensionManager } from "../../core/extension-manager";
import type { Extension } from "../../core/types";
import { createTestEditor } from "../../testing";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Selection, selectionFocusKey } from "./selection";

const extensions = () => [Document(), Text(), Paragraph(), Selection()];

const ruleExtension: Extension<unknown> = {
  name: "rule",
  nodes: {
    rule: {
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM: () => ["hr"],
    },
  },
};

const decorationsOf = (editor: Editor): DecorationSet | null => {
  const plugin = editor.state.plugins.find((candidate) => candidate.props.decorations);

  if (!plugin?.props.decorations) {
    throw new Error("Selection plugin is missing from the editor state.");
  }

  return plugin.props.decorations.call(plugin, editor.state) as DecorationSet | null;
};

const select = (editor: Editor, from: number, to: number): void => {
  editor.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
};

const setFocused = (editor: Editor, focused: boolean): void => {
  editor.dispatch(editor.state.tr.setMeta(selectionFocusKey, focused));
};

describe("Selection", () => {
  it("does not decorate a selection while the editor is focused", () => {
    const editor = createTestEditor(extensions(), "alpha beta");
    select(editor, 1, 6);

    expect(decorationsOf(editor)).toBeNull();
  });

  it("keeps the selection visible after the editor loses focus", () => {
    const editor = createTestEditor(extensions(), "alpha beta");
    select(editor, 1, 6);
    setFocused(editor, false);

    const decorations = decorationsOf(editor);
    const [decoration] = decorations?.find() ?? [];

    expect(decorations).not.toBeNull();
    expect(decoration?.from).toBe(1);
    expect(decoration?.to).toBe(6);
  });

  it("drops the decoration when the editor is focused again", () => {
    const editor = createTestEditor(extensions(), "alpha beta");
    select(editor, 1, 6);
    setFocused(editor, false);
    setFocused(editor, true);

    expect(decorationsOf(editor)).toBeNull();
  });

  it("does not decorate an empty selection", () => {
    const editor = createTestEditor(extensions(), "alpha beta");
    setFocused(editor, false);

    expect(decorationsOf(editor)).toBeNull();
  });

  it("decorates a node selection", () => {
    const allExtensions = [...extensions(), ruleExtension];
    const schema = createExtensionManager(allExtensions).schema;
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("a")),
      schema.node("rule"),
    ]);
    const editor = createEditor({ extensions: allExtensions, content: doc });

    editor.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)));
    setFocused(editor, false);

    const [decoration] = decorationsOf(editor)?.find() ?? [];

    expect(decoration?.from).toBe(3);
    expect(decoration?.to).toBe(4);
  });

  it("decorates an all-selection", () => {
    const editor = createTestEditor(extensions(), "alpha beta");

    editor.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
    setFocused(editor, false);

    const [decoration] = decorationsOf(editor)?.find() ?? [];

    expect(decoration?.from).toBe(0);
    expect(decoration?.to).toBe(editor.state.doc.content.size);
  });
});

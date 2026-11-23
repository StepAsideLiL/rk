import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import type { EditorCore } from "../../core/editor";
import { createTestEditor, docOf, press, roundTrip, textOf, typeText } from "../../testing";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Bold } from "./bold";

const extensions = () => [Document(), Text(), Paragraph(), Bold()];

const markNames = (editor: EditorCore): string[] => {
  const names = new Set<string>();

  docOf(editor).descendants((node) => {
    if (node.isText) {
      for (const mark of node.marks) {
        names.add(mark.type.name);
      }
    }
  });

  return [...names];
};

const selectAll = (editor: EditorCore): void => {
  editor.dispatch(
    editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, 1, editor.state.doc.content.size - 1),
    ),
  );
};

describe("Bold", () => {
  it("creates a valid schema", () => {
    const editor = createTestEditor(extensions(), "a");

    expect(editor.schema.marks.strong).toBeDefined();
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["**a**", "**a**"],
    ["__a__", "**a**"],
    ["a **b** c", "a **b** c"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });

  it("toggles bold on a selection", () => {
    const editor = createTestEditor(extensions(), "a");
    selectAll(editor);

    expect(editor.commands.toggleBold()).toBe(true);
    expect(textOf(editor)).toBe("a");
    expect(markNames(editor)).toContain("strong");
  });

  it("stores the mark for an empty selection", () => {
    const editor = createTestEditor(extensions(), "");

    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.state.storedMarks?.some((mark) => mark.type.name === "strong")).toBe(true);
  });

  it.each([
    ["**a*", "*"],
    ["__a_", "_"],
  ])("applies the bold input rule after typing %s", (content, finalCharacter) => {
    const editor = createTestEditor(extensions(), "");
    editor.dispatch(editor.state.tr.insertText(content));

    expect(typeText(editor, finalCharacter)).toBe(true);
    expect(textOf(editor)).toBe("a");
    expect(markNames(editor)).toContain("strong");
  });

  it("runs the Mod-b key binding", () => {
    const editor = createTestEditor(extensions(), "a");
    selectAll(editor);

    expect(press(editor, "Mod-b")).toBe(true);
    expect(markNames(editor)).toContain("strong");
  });
});

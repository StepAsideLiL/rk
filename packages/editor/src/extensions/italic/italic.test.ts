import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import type { Editor } from "../../editor";
import { createTestEditor, docOf, press, roundTrip, textOf, typeText } from "../../testing";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Italic } from "./italic";

const extensions = () => [Document(), Text(), Paragraph(), Italic()];

const markNames = (editor: Editor): string[] => {
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

const selectAll = (editor: Editor): void => {
  editor.dispatch(
    editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, 1, editor.state.doc.content.size - 1),
    ),
  );
};

describe("Italic", () => {
  it("creates a valid schema", () => {
    const editor = createTestEditor(extensions(), "a");

    expect(editor.schema.marks.emphasis).toBeDefined();
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["*a*", "*a*"],
    ["_a_", "*a*"],
    ["a *b* c", "a *b* c"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });

  it("toggles italic on a selection", () => {
    const editor = createTestEditor(extensions(), "a");
    selectAll(editor);

    expect(editor.commands.toggleItalic()).toBe(true);
    expect(textOf(editor)).toBe("a");
    expect(markNames(editor)).toContain("emphasis");
  });

  it("stores the mark for an empty selection", () => {
    const editor = createTestEditor(extensions(), "");

    expect(editor.commands.toggleItalic()).toBe(true);
    expect(editor.state.storedMarks?.some((mark) => mark.type.name === "emphasis")).toBe(true);
  });

  it.each([
    ["*a", "*"],
    ["_a", "_"],
  ])("applies the italic input rule after typing %s", (content, finalCharacter) => {
    const editor = createTestEditor(extensions(), "");
    editor.dispatch(editor.state.tr.insertText(content));

    expect(typeText(editor, finalCharacter)).toBe(true);
    expect(textOf(editor)).toBe("a");
    expect(markNames(editor)).toContain("emphasis");
  });

  it("runs the Mod-i key binding", () => {
    const editor = createTestEditor(extensions(), "a");
    selectAll(editor);

    expect(press(editor, "Mod-i")).toBe(true);
    expect(markNames(editor)).toContain("emphasis");
  });
});

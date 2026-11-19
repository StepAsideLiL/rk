import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import type { Editor } from "../../core/create-editor";
import { createTestEditor, docOf, press, roundTrip, textOf, typeText } from "../../testing";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Heading } from "./heading";

const extensions = () => [Document(), Text(), Paragraph(), Heading({ levels: [1, 2, 3] })];

const blockType = (editor: Editor) => {
  const block = docOf(editor).firstChild;

  return {
    name: block?.type.name,
    level: block?.attrs.level as number | undefined,
  };
};

describe("Heading", () => {
  it("creates a valid schema for the configured levels", () => {
    const editor = createTestEditor(extensions(), "# a");

    expect(editor.schema.nodes.heading).toBeDefined();
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["# a", "# a"],
    ["## b", "## b"],
    ["### c", "### c"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });

  it("toggles between paragraph and the primary heading level", () => {
    const editor = createTestEditor(extensions(), "a");

    editor.dispatch(editor.state.tr.setSelection(TextSelection.create(docOf(editor), 1)));
    expect(editor.commands.setHeading()).toBe(true);
    expect(blockType(editor)).toEqual({ name: "heading", level: 1 });

    expect(editor.commands.setHeading()).toBe(true);
    expect(blockType(editor)).toEqual({ name: "paragraph", level: undefined });
  });

  it.each([
    ["#", 1],
    ["##", 2],
    ["###", 3],
  ])("applies the heading input rule for %s", (hashes, level) => {
    const editor = createTestEditor(extensions(), "");
    editor.dispatch(editor.state.tr.insertText(hashes));

    expect(typeText(editor, " ")).toBe(true);
    expect(blockType(editor)).toEqual({ name: "heading", level });
    expect(textOf(editor)).toBe("");
  });

  it.each([
    ["Mod-Alt-1", 1],
    ["Mod-Alt-2", 2],
    ["Mod-Alt-3", 3],
  ])("runs the %s key binding", (key, level) => {
    const editor = createTestEditor(extensions(), "a");

    expect(press(editor, key)).toBe(true);
    expect(blockType(editor)).toEqual({ name: "heading", level });
  });
});

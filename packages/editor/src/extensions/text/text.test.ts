import { describe, expect, it } from "vitest";

import { createTestEditor, docOf, roundTrip, textOf } from "../../testing";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "./text";

const extensions = () => [Document(), Text(), Paragraph()];

describe("Text", () => {
  it("contributes the inline text node", () => {
    const editor = createTestEditor(extensions(), "hello");

    expect(editor.schema.nodes.text?.spec.group).toBe("inline");
    expect(textOf(editor)).toBe("hello");
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["hello", "hello"],
    ["hello world", "hello world"],
  ])("round trips inline text %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });
});

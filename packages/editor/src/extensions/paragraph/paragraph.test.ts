import { describe, expect, it } from "vitest";

import { createTestEditor, docOf, roundTrip, textOf } from "../../testing";
import { Document } from "../document/document";
import { Text } from "../text/text";
import { Paragraph } from "./paragraph";

const extensions = () => [Document(), Text(), Paragraph()];

describe("Paragraph", () => {
  it("creates valid paragraph documents", () => {
    const editor = createTestEditor(extensions(), "a\n\nb");

    expect(docOf(editor).childCount).toBe(2);
    expect(docOf(editor).firstChild?.type.name).toBe("paragraph");
    expect(textOf(editor)).toBe("ab");
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["a", "a"],
    ["a\n\nb", "a\n\nb"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });
});

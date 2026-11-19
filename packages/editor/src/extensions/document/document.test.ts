import { describe, expect, it } from "vitest";

import { createTestEditor, docOf, roundTrip } from "../../testing";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Document } from "./document";

const extensions = () => [Document(), Text(), Paragraph()];

describe("Document", () => {
  it("creates a valid empty document", () => {
    const editor = createTestEditor(extensions());

    expect(docOf(editor).type.name).toBe("doc");
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["a", "a"],
    ["a\n\nb", "a\n\nb"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions(), input)).toBe(expected);
  });
});

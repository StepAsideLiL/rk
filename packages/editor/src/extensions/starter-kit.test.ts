import { describe, expect, it } from "vitest";

import { createTestEditor, docOf, roundTrip, textOf } from "../testing";
import { starterKit } from "./index";

describe("starterKit", () => {
  it("provides the default schema", () => {
    const editor = createTestEditor(starterKit(), "# **a** *b*");

    expect(editor.schema.nodes.doc).toBeDefined();
    expect(editor.schema.nodes.paragraph).toBeDefined();
    expect(editor.schema.nodes.heading).toBeDefined();
    expect(editor.schema.marks.strong).toBeDefined();
    expect(editor.schema.marks.emphasis).toBeDefined();
    expect(textOf(editor)).toBe("a b");
    expect(() => docOf(editor).check()).not.toThrow();
  });

  it.each([
    ["**a**", "**a**"],
    ["*a*", "*a*"],
    ["# a", "# a"],
    ["## a", "## a"],
    ["**a *b* c**", "**a *b* c**"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(starterKit(), input)).toBe(expected);
  });
});

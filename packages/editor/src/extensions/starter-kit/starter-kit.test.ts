import { describe, expect, it } from "vitest";

import { createTestEditor, docOf, roundTrip, textOf } from "../../testing";
import { StarterKit } from "./starter-kit";

const extensions = [StarterKit()];

describe("StarterKit", () => {
  it("provides the default schema and editor behavior", () => {
    const editor = createTestEditor(extensions, "# **a** *b*");

    expect(editor.schema.nodes.doc).toBeDefined();
    expect(editor.schema.nodes.paragraph).toBeDefined();
    expect(editor.schema.nodes.heading).toBeDefined();
    expect(editor.schema.marks.strong).toBeDefined();
    expect(editor.schema.marks.emphasis).toBeDefined();
    expect(editor.state.plugins.some((plugin) => plugin.props.decorations)).toBe(true);
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
    expect(roundTrip(extensions, input)).toBe(expected);
  });
});

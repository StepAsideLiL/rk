import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../../core/extension-manager";
import { createTestEditor, roundTrip } from "../../testing";
import { PlaygroundKit } from "./playground-kit";

const extensions = [PlaygroundKit()];

describe("PlaygroundKit", () => {
  it("bundles every extension", () => {
    const manager = new ExtensionManager(extensions);

    expect(manager.extensions.map((extension) => extension.name).sort()).toEqual([
      "bold",
      "document",
      "heading",
      "italic",
      "paragraph",
      "selection",
      "text",
    ]);
    expect(manager.schema.nodes.doc).toBeDefined();
    expect(manager.schema.nodes.heading).toBeDefined();
    expect(manager.schema.marks.strong).toBeDefined();
    expect(manager.schema.marks.emphasis).toBeDefined();
  });

  it("provides the full editor behavior", () => {
    const editor = createTestEditor(extensions, "# **a** *b*");

    expect(editor.commands.toggleBold).toBeTypeOf("function");
    expect(editor.commands.toggleItalic).toBeTypeOf("function");
    expect(editor.commands.setHeading).toBeTypeOf("function");
  });

  it.each([
    ["**a**", "**a**"],
    ["*a*", "*a*"],
    ["# a", "# a"],
    ["**a *b* c**", "**a *b* c**"],
  ])("round trips %s", (input, expected) => {
    expect(roundTrip(extensions, input)).toBe(expected);
  });
});

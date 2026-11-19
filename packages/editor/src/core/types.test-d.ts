import { describe, expectTypeOf, it } from "vitest";

import type { Command, Commands, Extension, MdastHandler, PmHandler } from "./types";

declare module "./types" {
  interface Commands {
    toggleBold: Command;
  }
}

describe("core types", () => {
  it("merges augmented Commands entries", () => {
    expectTypeOf<keyof Commands>().toEqualTypeOf<"toggleBold">();

    const commands: Partial<Commands> = {
      toggleBold: (state) => state.doc.nodeSize > 0,
    };

    expectTypeOf(commands.toggleBold).toEqualTypeOf<Command | undefined>();

    // @ts-expect-error - only commands added by augmentation are allowed
    const unknownCommand: Partial<Commands> = { insertTable: () => true };
    expectTypeOf(unknownCommand).toEqualTypeOf<Partial<Commands>>();
  });

  it("rejects handlers with the wrong signature", () => {
    // @ts-expect-error - mdast handlers receive mdast content, not a number
    const invalidMdast: MdastHandler = (_node: number) => null;
    // @ts-expect-error - ProseMirror handlers receive a node, not a string
    const invalidPm: PmHandler = (_node: string) => null;

    expectTypeOf(invalidMdast).toEqualTypeOf<MdastHandler>();
    expectTypeOf(invalidPm).toEqualTypeOf<PmHandler>();
  });

  it("preserves the options type of an extension", () => {
    const factory = (options: { label: string }): Extension<{ label: string }> => ({
      name: options.label,
    });

    expectTypeOf(factory).returns.toEqualTypeOf<Extension<{ label: string }>>();
  });
});

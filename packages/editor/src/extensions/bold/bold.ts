import { toggleMark } from "prosemirror-commands";

import type { Command } from "../../core/types";
import { defineExtension } from "../../core/types";
import { markInputRule } from "../shared/mark-input-rule";

declare module "../../core/types" {
  interface Commands {
    /** Toggle the strong mark on the selection or stored marks. */
    toggleBold: import("../../core/types").Command;
  }
}

/** Strong mark with its command, key binding and input rule. */
export const Bold = defineExtension(() => ({
  name: "bold",
  priority: 40,
  requires: ["text"],
  marks: {
    strong: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM: () => ["strong", 0],
    },
  },
  commands(context) {
    const strong = context.schema.marks.strong;

    return strong ? { toggleBold: toggleMark(strong) } : {};
  },
  keymap(context): Readonly<Record<string, Command>> {
    const strong = context.schema.marks.strong;

    return strong ? { "Mod-b": toggleMark(strong) } : {};
  },
  inputRules(context) {
    const strong = context.schema.marks.strong;

    return strong ? [markInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, strong)] : [];
  },
}));

import { toggleMark } from "prosemirror-commands";

import type { Command } from "../../core/types";
import { defineExtension } from "../../core/types";
import { markInputRule } from "../shared/mark-input-rule";

declare module "../../core/types" {
  interface Commands {
    /** Toggle the emphasis mark on the selection or stored marks. */
    toggleItalic: import("../../core/types").Command;
  }
}

/** Emphasis mark with its command, key binding and input rule. */
export const Italic = defineExtension(() => ({
  name: "italic",
  priority: 50,
  requires: ["text"],
  marks: {
    emphasis: {
      parseDOM: [{ tag: "em" }, { tag: "i" }],
      toDOM: () => ["em", 0],
    },
  },
  commands(context) {
    const emphasis = context.schema.marks.emphasis;

    return emphasis ? { toggleItalic: toggleMark(emphasis) } : {};
  },
  keymap(context): Readonly<Record<string, Command>> {
    const emphasis = context.schema.marks.emphasis;

    return emphasis ? { "Mod-i": toggleMark(emphasis) } : {};
  },
  inputRules(context) {
    const emphasis = context.schema.marks.emphasis;

    return emphasis ? [markInputRule(/(?<![*_])(?:\*([^*]+)\*|_([^_]+)_)$/, emphasis)] : [];
  },
}));

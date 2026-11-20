import { toggleMark } from "prosemirror-commands";

import type { Command } from "../../core/types";
import { defineExtension } from "../../core/types";
import { markInputRule } from "../shared/mark-input-rule";
import { EXTENSION_NAMES, getMarkType, MARK_NAMES } from "../shared/schema";

declare module "../../core/types" {
  interface Commands {
    /** Toggle the emphasis mark on the selection or stored marks. */
    toggleItalic: import("../../core/types").Command;
  }
}

/** Emphasis mark with its command, key binding and input rule. */
export const Italic = defineExtension(() => ({
  name: EXTENSION_NAMES.italic,
  priority: 50,
  requires: [EXTENSION_NAMES.text],
  marks: {
    [MARK_NAMES.italic]: {
      parseDOM: [{ tag: "em" }, { tag: "i" }],
      toDOM: () => ["em", 0],
    },
  },
  html: {
    sanitize: { tagNames: ["em", "i"] },
  },
  commands(context) {
    const emphasis = getMarkType(context.schema, MARK_NAMES.italic);

    return emphasis ? { toggleItalic: toggleMark(emphasis) } : {};
  },
  keymap(context): Readonly<Record<string, Command>> {
    const emphasis = getMarkType(context.schema, MARK_NAMES.italic);

    return emphasis ? { "Mod-i": toggleMark(emphasis) } : {};
  },
  inputRules(context) {
    const emphasis = getMarkType(context.schema, MARK_NAMES.italic);

    return emphasis ? [markInputRule(/(?<![*_])(?:\*([^*]+)\*|_([^_]+)_)$/, emphasis)] : [];
  },
}));

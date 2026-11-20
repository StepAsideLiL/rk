import { toggleMark } from "prosemirror-commands";

import type { Command } from "../../core/types";
import { defineExtension } from "../../core/types";
import { markInputRule } from "../shared/mark-input-rule";
import { EXTENSION_NAMES, getMarkType, MARK_NAMES } from "../shared/schema";

declare module "../../core/types" {
  interface Commands {
    /** Toggle the strong mark on the selection or stored marks. */
    toggleBold: import("../../core/types").Command;
  }
}

/** Strong mark with its command, key binding and input rule. */
export const Bold = defineExtension(() => ({
  name: EXTENSION_NAMES.bold,
  priority: 40,
  requires: [EXTENSION_NAMES.text],
  marks: {
    [MARK_NAMES.bold]: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM: () => ["strong", 0],
    },
  },
  html: {
    sanitize: { tagNames: ["strong", "b"] },
  },
  commands(context) {
    const strong = getMarkType(context.schema, MARK_NAMES.bold);

    return strong ? { toggleBold: toggleMark(strong) } : {};
  },
  keymap(context): Readonly<Record<string, Command>> {
    const strong = getMarkType(context.schema, MARK_NAMES.bold);

    return strong ? { "Mod-b": toggleMark(strong) } : {};
  },
  inputRules(context) {
    const strong = getMarkType(context.schema, MARK_NAMES.bold);

    return strong ? [markInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, strong)] : [];
  },
}));

import type { PhrasingContent } from "mdast";
import { setBlockType } from "prosemirror-commands";
import { textblockTypeInputRule } from "prosemirror-inputrules";

import type { Command, Extension } from "../../core/types";
import { defineExtension } from "../../core/types";
import { EXTENSION_NAMES, getNodeType, NODE_NAMES } from "../shared/schema";

declare module "../../core/types" {
  interface Commands {
    /** Toggle the current block between paragraph and the first heading level. */
    setHeading: import("../../core/types").Command;
  }
}

/** Heading configuration. */
export interface HeadingOptions {
  /** Levels this extension contributes. Defaults to all six levels. */
  readonly levels?: readonly number[];
}

const DEFAULT_LEVELS: readonly number[] = Object.freeze([1, 2, 3, 4, 5, 6]);

/**
 * Heading textblocks for the configured levels.
 *
 * `setHeading` toggles between paragraph and the first configured level; the
 * keymap and input rule cover the individual levels.
 */
export const Heading = defineExtension((options: HeadingOptions): Extension<HeadingOptions> => {
  const levels = normalizeLevels(options.levels);
  const primaryLevel = levels[0] ?? 1;

  return {
    name: EXTENSION_NAMES.heading,
    priority: 30,
    requires: [EXTENSION_NAMES.paragraph],
    nodes: {
      [NODE_NAMES.heading]: {
        attrs: { level: { default: primaryLevel } },
        content: "inline*",
        group: "block",
        defining: true,
        parseDOM: levels.map((level) => ({
          tag: `h${level}`,
          attrs: { level },
        })),
        toDOM: (node) => [`h${node.attrs.level}`, 0] as const,
      },
    },
    html: {
      sanitize: { tagNames: levels.map((level) => `h${level}`) },
    },
    commands(context) {
      const heading = getNodeType(context.schema, NODE_NAMES.heading);
      const paragraph = getNodeType(context.schema, NODE_NAMES.paragraph);

      if (!heading || !paragraph) {
        return {};
      }

      const setHeading: Command = (state, dispatch) => {
        const parent = state.selection.$from.parent;

        if (parent.type === heading && parent.attrs.level === primaryLevel) {
          return setBlockType(paragraph)(state, dispatch);
        }

        return setBlockType(heading, { level: primaryLevel })(state, dispatch);
      };

      return { setHeading };
    },
    keymap(context) {
      const heading = getNodeType(context.schema, NODE_NAMES.heading);

      if (!heading) {
        return {};
      }

      const bindings: Record<string, Command> = {};

      for (const level of levels) {
        if (level <= 3) {
          bindings[`Mod-Alt-${level}`] = setBlockType(heading, { level });
        }
      }

      return bindings;
    },
    inputRules(context) {
      const heading = getNodeType(context.schema, NODE_NAMES.heading);

      if (!heading) {
        return [];
      }

      const pattern = levels.map((level) => "#".repeat(level)).join("|");

      return [
        textblockTypeInputRule(new RegExp(`^(${pattern})\\s$`), heading, (match) => ({
          level: (match[1] ?? "").length,
        })),
      ];
    },
    markdown: {
      fromMdast: {
        heading(node, state) {
          if (node.type !== "heading" || !levels.includes(node.depth)) {
            return null;
          }

          const heading = getNodeType(state.schema, NODE_NAMES.heading);

          return heading
            ? heading.create({ level: node.depth }, state.inline(node.children))
            : null;
        },
      },
      toMdast: {
        heading(node, state) {
          if (node.type.name !== NODE_NAMES.heading) {
            return null;
          }

          const level = node.attrs.level as number;

          if (!levels.includes(level)) {
            return null;
          }

          return {
            type: "heading",
            depth: level as 1 | 2 | 3 | 4 | 5 | 6,
            children: state.inline(node.content.content) as PhrasingContent[],
          };
        },
      },
    },
  };
});

/** Validate and sort configured levels. */
function normalizeLevels(levels: readonly number[] | undefined): number[] {
  const normalized = [...new Set(levels ?? DEFAULT_LEVELS)].sort((left, right) => left - right);

  if (normalized.length === 0) {
    throw new Error("Heading requires at least one level.");
  }

  for (const level of normalized) {
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      throw new Error(`Invalid heading level "${level}". Levels must be integers between 1 and 6.`);
    }
  }

  return normalized;
}

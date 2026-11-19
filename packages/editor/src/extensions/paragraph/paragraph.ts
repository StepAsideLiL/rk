import type { PhrasingContent } from "mdast";

import { defineExtension } from "../../core/types";
import { EXTENSION_NAMES, getNodeType, NODE_NAMES } from "../shared/schema";

/** Paragraph textblock and its markdown handlers. */
export const Paragraph = defineExtension(() => ({
  name: EXTENSION_NAMES.paragraph,
  priority: 20,
  requires: [EXTENSION_NAMES.document],
  nodes: {
    [NODE_NAMES.paragraph]: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
  },
  markdown: {
    fromMdast: {
      paragraph(node, state) {
        if (node.type !== "paragraph") {
          return null;
        }

        const paragraph = getNodeType(state.schema, NODE_NAMES.paragraph);

        return paragraph ? paragraph.create(null, state.inline(node.children)) : null;
      },
    },
    toMdast: {
      paragraph(node, state) {
        if (node.type.name !== NODE_NAMES.paragraph) {
          return null;
        }

        return {
          type: "paragraph",
          children: state.inline(node.content.content) as PhrasingContent[],
        };
      },
    },
  },
}));

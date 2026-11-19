import type { PhrasingContent } from "mdast";

import { defineExtension } from "../../core/types";

/** Paragraph textblock and its markdown handlers. */
export const Paragraph = defineExtension(() => ({
  name: "paragraph",
  priority: 20,
  requires: ["document"],
  nodes: {
    paragraph: {
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

        const paragraph = state.schema.nodes.paragraph;

        return paragraph ? paragraph.create(null, state.inline(node.children)) : null;
      },
    },
    toMdast: {
      paragraph(node, state) {
        if (node.type.name !== "paragraph") {
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

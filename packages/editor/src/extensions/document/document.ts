import type { BlockContent } from "mdast";

import { defineExtension } from "../../core/types";

/** Root document node and its markdown handlers. */
export const Document = defineExtension(() => ({
  name: "document",
  priority: 0,
  nodes: {
    doc: { content: "block+" },
  },
  markdown: {
    fromMdast: {
      root(node, state) {
        if (node.type !== "root") {
          return null;
        }

        const doc = state.schema.nodes.doc;

        if (!doc) {
          return null;
        }

        return doc.createAndFill(null, state.block(node.children as BlockContent[]));
      },
    },
    toMdast: {
      doc(node, state) {
        if (node.type.name !== "doc") {
          return null;
        }

        return state.block(node.content.content);
      },
    },
  },
}));

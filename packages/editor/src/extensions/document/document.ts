import type { BlockContent } from "mdast";

import { defineExtension } from "../../core/types";
import { EXTENSION_NAMES, getNodeType, NODE_NAMES } from "../shared/schema";

export const Document = defineExtension(() => ({
  name: EXTENSION_NAMES.document,
  priority: 0,
  nodes: {
    [NODE_NAMES.document]: { content: "block+" },
  },
  markdown: {
    fromMdast: {
      root(node, state) {
        if (node.type !== "root") {
          return null;
        }

        const doc = getNodeType(state.schema, NODE_NAMES.document);

        if (!doc) {
          return null;
        }

        return doc.createAndFill(null, state.block(node.children as BlockContent[]));
      },
    },
    toMdast: {
      doc(node, state) {
        if (node.type.name !== NODE_NAMES.document) {
          return null;
        }

        return state.block(node.content.content);
      },
    },
  },
}));

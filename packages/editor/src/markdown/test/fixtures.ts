import type { BlockContent, ListItem, PhrasingContent } from "mdast";

import type { Extension } from "../../core/types";

export const documentExtension: Extension<unknown> = {
  name: "test-document",
  priority: 0,
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
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
};

export const blockquoteExtension: Extension<unknown> = {
  name: "test-blockquote",
  priority: 40,
  nodes: {
    blockquote: { group: "block", content: "block+" },
  },
};

export const paragraphExtension: Extension<unknown> = {
  name: "test-paragraph",
  priority: 10,
  nodes: {
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
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
};

export const listExtension: Extension<unknown> = {
  name: "test-list",
  priority: 20,
  nodes: {
    bullet_list: { group: "block", content: "list_item+", toDOM: () => ["ul", 0] },
    list_item: { content: "paragraph+", toDOM: () => ["li", 0] },
  },
  markdown: {
    fromMdast: {
      list(node, state) {
        if (node.type !== "list" || node.ordered) {
          return null;
        }

        const bulletList = state.schema.nodes.bullet_list;

        return bulletList
          ? bulletList.create(null, state.block(node.children as unknown as BlockContent[]))
          : null;
      },
      listItem(node, state) {
        if (node.type !== "listItem") {
          return null;
        }

        const listItem = state.schema.nodes.list_item;

        return listItem
          ? listItem.create(null, state.block(node.children as BlockContent[]))
          : null;
      },
    },
    toMdast: {
      bullet_list(node, state) {
        if (node.type.name !== "bullet_list") {
          return null;
        }

        return {
          type: "list",
          ordered: false,
          spread: false,
          children: state.block(node.content.content) as ListItem[],
        };
      },
      list_item(node, state) {
        if (node.type.name !== "list_item") {
          return null;
        }

        return {
          type: "listItem",
          spread: false,
          checked: null,
          children: state.block(node.content.content) as BlockContent[],
        };
      },
    },
  },
};

export const marksExtension: Extension<unknown> = {
  name: "test-marks",
  priority: 30,
  marks: {
    strong: {},
    emphasis: {},
    code: {},
    link: { attrs: { href: {}, title: { default: null } } },
  },
};

export const testExtensions: readonly Extension<unknown>[] = [
  documentExtension,
  paragraphExtension,
  listExtension,
  marksExtension,
  blockquoteExtension,
];

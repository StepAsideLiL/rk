import type { MarkType, NodeType, Schema } from "prosemirror-model";

export const EXTENSION_NAMES = Object.freeze({
  document: "document",
  text: "text",
  paragraph: "paragraph",
  heading: "heading",
  bold: "bold",
  italic: "italic",
  selection: "selection",
  starterKit: "starter-kit",
  playgroundKit: "playground-kit",
} as const);

export const NODE_NAMES = Object.freeze({
  document: "doc",
  text: "text",
  paragraph: "paragraph",
  heading: "heading",
} as const);

export const MARK_NAMES = Object.freeze({
  bold: "strong",
  italic: "emphasis",
} as const);

export type NodeName = (typeof NODE_NAMES)[keyof typeof NODE_NAMES];

export type MarkName = (typeof MARK_NAMES)[keyof typeof MARK_NAMES];

export function getNodeType(schema: Schema, name: NodeName): NodeType | undefined {
  return schema.nodes[name];
}

export function getMarkType(schema: Schema, name: MarkName): MarkType | undefined {
  return schema.marks[name];
}

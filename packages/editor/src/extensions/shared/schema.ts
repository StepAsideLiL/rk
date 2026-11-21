import type { MarkType, NodeType, Schema } from "prosemirror-model";

/** Extension names, used by the `requires` dependency list. */
export const EXTENSION_NAMES = Object.freeze({
  document: "document",
  text: "text",
  paragraph: "paragraph",
  heading: "heading",
  bold: "bold",
  italic: "italic",
  selection: "selection",
} as const);

/** Node names shared between extensions. */
export const NODE_NAMES = Object.freeze({
  document: "doc",
  text: "text",
  paragraph: "paragraph",
  heading: "heading",
} as const);

/** Mark names shared between extensions and the markdown mark helpers. */
export const MARK_NAMES = Object.freeze({
  bold: "strong",
  italic: "emphasis",
} as const);

/** A node name known to the built-in extensions. */
export type NodeName = (typeof NODE_NAMES)[keyof typeof NODE_NAMES];

/** A mark name known to the built-in extensions. */
export type MarkName = (typeof MARK_NAMES)[keyof typeof MARK_NAMES];

/** Read a node type by name without assuming it exists. */
export function getNodeType(schema: Schema, name: NodeName): NodeType | undefined {
  return schema.nodes[name];
}

/** Read a mark type by name without assuming it exists. */
export function getMarkType(schema: Schema, name: MarkName): MarkType | undefined {
  return schema.marks[name];
}

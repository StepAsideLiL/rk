import type { BlockContent, Content, PhrasingContent, Root, RootContent } from "mdast";
import type { Mark, Node as PmNode, Schema } from "prosemirror-model";

import type { CollectedMarkdown } from "../core/extension-manager";
import type { FromMdastState, ToMdastState } from "../core/types";
import { inlineFromMdast, inlineToMdast, withMdastMarks } from "./marks";
import type { UnknownNodeStrategy } from "./types";

/**
 * Convert an mdast root into a ProseMirror document.
 *
 * The `root` handler is preferred. Without one, `preserve` converts the root's
 * children as blocks, `drop` returns an empty document and `throw` reports the
 * missing handler.
 */
export function fromMdastRoot(
  root: Root,
  schema: Schema,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): PmNode {
  const state = createFromMdastState(schema, handlers, strategy);
  const handler = handlers.fromMdast.root;

  if (handler) {
    const result = handler(root, state);

    if (result !== null) {
      const nodes = toArray(result);

      if (nodes[0]) {
        return nodes[0];
      }
    }
  }

  if (strategy === "throw") {
    throw unknownMdastError("root");
  }

  if (strategy === "drop") {
    const doc = schema.topNodeType.createAndFill();

    if (!doc) {
      throw new Error("Could not create an empty document for the assembled schema.");
    }

    return doc;
  }

  const doc = schema.topNodeType.createAndFill(null, state.block(root.children as BlockContent[]));

  if (!doc) {
    throw new Error("Could not build a document from the markdown root.");
  }

  return doc;
}

/**
 * Convert a ProseMirror document into an mdast root.
 *
 * The `doc` handler (keyed by the ProseMirror node type) supplies the root's
 * children. Unknown documents follow the configured strategy.
 */
export function toMdastRoot(
  doc: PmNode,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): Root {
  const state = createToMdastState(doc.type.schema, handlers, strategy);
  const handler = handlers.toMdast[doc.type.name];
  let children: RootContent[];

  if (handler) {
    const result = handler(doc, state);

    if (result === null) {
      children = preservePmNode(doc, state, strategy) as RootContent[];
    } else if (Array.isArray(result)) {
      children = [...result] as RootContent[];
    } else if ((result as unknown as Root).type === "root") {
      children = (result as unknown as Root).children;
    } else {
      children = [result as Content] as RootContent[];
    }
  } else {
    children = preservePmNode(doc, state, strategy) as RootContent[];
  }

  return { type: "root", children };
}

/** Build the helper state passed to mdast handlers. */
function createFromMdastState(
  schema: Schema,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): FromMdastState {
  const state: FromMdastState = {
    schema,
    block(nodes) {
      return nodes.flatMap((node) => convertBlock(node, state, handlers, strategy));
    },
    inline(nodes) {
      return inlineFromMdast(nodes, schema, {
        onUnknown(node, marks) {
          const handler = handlers.fromMdast[node.type];

          if (handler) {
            const result = handler(node as Content, state);

            if (result !== null) {
              return toArray(result);
            }
          }

          return preserveInline(node, marks, state, strategy);
        },
      });
    },
    text(node) {
      return schema.text(node.value);
    },
    withMarks(node, marks) {
      return node.isInline ? node.mark(marks) : node;
    },
  };

  return state;
}

/** Build the helper state passed to ProseMirror handlers. */
function createToMdastState(
  schema: Schema,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): ToMdastState {
  const state: ToMdastState = {
    schema,
    block(nodes) {
      return nodes.flatMap((node) => convertPmNode(node, state, handlers, strategy));
    },
    inline(nodes) {
      return inlineToMdast(nodes, {
        onNode(node) {
          return convertPmNode(node, state, handlers, strategy);
        },
      });
    },
    text(node) {
      return { type: "text", value: node.text ?? "" };
    },
    withMarks(node, marks) {
      return withMdastMarks(node, marks);
    },
  };

  return state;
}

/** Convert one mdast block node through the registry. */
function convertBlock(
  node: Content,
  state: FromMdastState,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): PmNode[] {
  const handler = handlers.fromMdast[node.type];

  if (handler) {
    const result = handler(node, state);

    if (result !== null) {
      return toArray(result);
    }
  }

  return preserveBlock(node, state, strategy);
}

/** Convert one ProseMirror node through the registry. */
function convertPmNode(
  node: PmNode,
  state: ToMdastState,
  handlers: CollectedMarkdown,
  strategy: UnknownNodeStrategy,
): Content[] {
  const handler = handlers.toMdast[node.type.name];

  if (handler) {
    const result = handler(node, state);

    if (result !== null) {
      return toArray(result);
    }
  }

  return preservePmNode(node, state, strategy);
}

/** Apply the unknown-node strategy to an mdast block node. */
function preserveBlock(
  node: Content,
  state: FromMdastState,
  strategy: UnknownNodeStrategy,
): PmNode[] {
  if (strategy === "throw") {
    throw unknownMdastError(node.type);
  }

  if (strategy === "drop") {
    return [];
  }

  if ("children" in node && Array.isArray(node.children)) {
    return state.block(node.children as BlockContent[]);
  }

  if ("value" in node && typeof node.value === "string") {
    const paragraph = state.schema.nodes.paragraph;

    return paragraph ? [paragraph.create(null, state.schema.text(node.value))] : [];
  }

  return [];
}

/** Apply the unknown-node strategy to an mdast inline node. */
function preserveInline(
  node: PhrasingContent,
  marks: readonly Mark[],
  state: FromMdastState,
  strategy: UnknownNodeStrategy,
): PmNode[] {
  if (strategy === "throw") {
    throw unknownMdastError(node.type);
  }

  if (strategy === "drop") {
    return [];
  }

  if ("children" in node && Array.isArray(node.children)) {
    return state.inline(node.children as PhrasingContent[]).map((child) => child.mark(marks));
  }

  if ("value" in node && typeof node.value === "string") {
    return [state.schema.text(node.value, marks)];
  }

  return [];
}

/** Apply the unknown-node strategy to a ProseMirror node. */
function preservePmNode(
  node: PmNode,
  state: ToMdastState,
  strategy: UnknownNodeStrategy,
): Content[] {
  if (strategy === "throw") {
    throw unknownPmError(node.type.name);
  }

  if (strategy === "drop") {
    return [];
  }

  if (node.isText) {
    return [{ type: "text", value: node.text ?? "" }];
  }

  if (node.isInline) {
    return state.inline(node.content.content);
  }

  return state.block(node.content.content);
}

/** Error raised by the `throw` strategy for mdast nodes. */
function unknownMdastError(type: string): Error {
  return new Error(`No markdown handler for mdast node "${type}".`);
}

/** Error raised by the `throw` strategy for ProseMirror nodes. */
function unknownPmError(type: string): Error {
  return new Error(`No markdown handler for ProseMirror node "${type}".`);
}

/** Normalize a handler result to an array. */
function toArray<T>(value: T | readonly T[]): T[] {
  return Array.isArray(value) ? [...value] : [value as T];
}

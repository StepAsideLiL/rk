import type { BlockContent, Content, PhrasingContent, Root, RootContent } from "mdast";
import type { Mark, Node as PmNode, Schema } from "prosemirror-model";

import type { CollectedMarkdown } from "../core/extension-manager";
import type { FromMdastState, ToMdastState } from "../core/types";
import { inlineFromMdast, inlineToMdast, withMdastMarks } from "./marks";
import type { UnknownNodeStrategy } from "./types";

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

    /* v8 ignore next 3 */
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
        markFromMdast(node) {
          const handler = handlers.markFromMdast[node.type];
          return handler ? handler(node as Content, schema) : null;
        },
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
        markToMdast: handlers.markToMdast,
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
    return [{ type: "text", value: node.text! }];
  }

  if (node.isInline) {
    return state.inline(node.content.content);
  }

  return state.block(node.content.content);
}

function unknownMdastError(type: string): Error {
  return new Error(`No markdown handler for mdast node "${type}".`);
}

function unknownPmError(type: string): Error {
  return new Error(`No markdown handler for ProseMirror node "${type}".`);
}

function toArray<T>(value: T | readonly T[]): T[] {
  return Array.isArray(value) ? [...value] : [value as T];
}

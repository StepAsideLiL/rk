import type { Emphasis, InlineCode, Link, PhrasingContent, Strong } from "mdast";
import type { Mark, Node as PmNode, Schema } from "prosemirror-model";

import type { Content } from "mdast";

/** mdast nodes that map to a ProseMirror mark. */
export type MdastMark = Strong | Emphasis | InlineCode | Link;

/**
 * Deterministic outer-to-inner order used when re-nesting marks.
 *
 * `link` wraps `strong`, which wraps `emphasis`. `code` is a leaf and is
 * emitted as `inlineCode` instead of a parent node.
 */
export const MARK_ORDER = Object.freeze(["link", "strong", "emphasis", "code"] as const);

/** Name of a mark handled by the shared mark helpers. */
export type MarkName = (typeof MARK_ORDER)[number];

/** Whether this mdast node is a mark wrapper handled by {@link markFromMdast}. */
export function isMdastMark(node: PhrasingContent): node is MdastMark {
  return (
    node.type === "strong" ||
    node.type === "emphasis" ||
    node.type === "inlineCode" ||
    node.type === "link"
  );
}

/**
 * Map an mdast mark node to a ProseMirror mark.
 *
 * Returns `null` when the schema does not define the matching mark; callers
 * then keep descending without adding a mark so no content is lost.
 */
export function markFromMdast(node: MdastMark, schema: Schema): Mark | null {
  switch (node.type) {
    case "strong":
      return schema.marks.strong?.create() ?? null;
    case "emphasis":
      return schema.marks.emphasis?.create() ?? null;
    case "inlineCode":
      return schema.marks.code?.create() ?? null;
    case "link":
      return (
        schema.marks.link?.create({
          href: node.url,
          title: node.title ?? null,
        }) ?? null
      );
  }
}

/** Callback used when an inline mdast node cannot be converted by the helpers. */
export type UnknownMdastInline = (node: PhrasingContent, marks: readonly Mark[]) => PmNode[] | null;

/** Options for {@link inlineFromMdast}. */
export interface InlineFromMdastOptions {
  /** Called for inline nodes that are neither text nor a known mark wrapper. */
  readonly onUnknown?: UnknownMdastInline;
}

/**
 * Convert mdast phrasing content into flat ProseMirror text nodes.
 *
 * Marks are accumulated while descending, so nested mdast mark wrappers become
 * mark sets on the resulting text nodes instead of nested ProseMirror structure.
 */
export function inlineFromMdast(
  children: readonly PhrasingContent[],
  schema: Schema,
  options: InlineFromMdastOptions = {},
): PmNode[] {
  const result: PmNode[] = [];
  visit(children, []);
  return result;

  function visit(nodes: readonly PhrasingContent[], marks: readonly Mark[]): void {
    for (const node of nodes) {
      if (node.type === "text") {
        result.push(schema.text(node.value, marks));
        continue;
      }

      if (node.type === "inlineCode") {
        const mark = schema.marks.code?.create();
        result.push(schema.text(node.value, mark ? [...marks, mark] : marks));
        continue;
      }

      if (node.type === "strong" || node.type === "emphasis" || node.type === "link") {
        const mark = markFromMdast(node, schema);
        visit(node.children, mark ? [...marks, mark] : marks);
        continue;
      }

      const replaced = options.onUnknown?.(node, marks);
      if (replaced) {
        result.push(...replaced);
      }
    }
  }
}

/** Callback used for inline ProseMirror nodes without a registered handler. */
export type ConvertPmInlineNode = (node: PmNode) => Content[] | null;

/** Options for {@link inlineToMdast}. */
export interface InlineToMdastOptions {
  /** Called for non-text ProseMirror nodes. */
  readonly onNode?: ConvertPmInlineNode;
}

/** One piece of inline content before mark nesting is reconstructed. */
type InlinePart =
  | { readonly kind: "text"; readonly value: string; readonly marks: readonly Mark[] }
  | {
      readonly kind: "inlineCode";
      readonly value: string;
      readonly marks: readonly Mark[];
    }
  | { readonly kind: "node"; readonly node: Content };

/** Order in which mark parents are nested, outer to inner. */
const NESTING_ORDER = Object.freeze(["link", "strong", "emphasis"] as const);

/**
 * Convert ProseMirror inline content into mdast phrasing content.
 *
 * Adjacent text with the same marks is merged. Marks are re-nested in a
 * deterministic order (`link` > `strong` > `emphasis`), and a `code` mark is
 * emitted as an `inlineCode` leaf.
 */
export function inlineToMdast(
  nodes: readonly PmNode[],
  options: InlineToMdastOptions = {},
): Content[] {
  const parts: InlinePart[] = [];

  for (const node of nodes) {
    if (node.isText) {
      const value = node.text ?? "";

      if (value.length === 0) {
        continue;
      }

      if (hasMark(node.marks, "code")) {
        parts.push({ kind: "inlineCode", value, marks: node.marks });
      } else {
        parts.push({ kind: "text", value, marks: node.marks });
      }

      continue;
    }

    const converted = options.onNode?.(node) ?? [];

    for (const child of converted) {
      parts.push({ kind: "node", node: child });
    }
  }

  const result: Content[] = [];
  build(mergeParts(parts), 0, result);
  return result;
}

/**
 * Apply mark wrappers to a single mdast node.
 *
 * Only text nodes can gain marks; block nodes are returned unchanged.
 */
export function withMdastMarks(node: Content, marks: readonly Mark[]): Content {
  if (marks.length === 0 || node.type !== "text") {
    return node;
  }

  const result: Content[] = [];
  build([{ kind: "text", value: node.value, marks }], 0, result);

  return result[0] ?? node;
}

/** Merge adjacent text or inline-code parts that carry identical marks. */
function mergeParts(parts: readonly InlinePart[]): InlinePart[] {
  const merged: InlinePart[] = [];

  for (const part of parts) {
    const last = merged[merged.length - 1];

    if (last?.kind === "text" && part.kind === "text" && sameMarks(last.marks, part.marks)) {
      merged[merged.length - 1] = {
        kind: "text",
        value: last.value + part.value,
        marks: last.marks,
      };
      continue;
    }

    if (
      last?.kind === "inlineCode" &&
      part.kind === "inlineCode" &&
      sameMarks(last.marks, part.marks)
    ) {
      merged[merged.length - 1] = {
        kind: "inlineCode",
        value: last.value + part.value,
        marks: last.marks,
      };
      continue;
    }

    merged.push(part);
  }

  return merged;
}

/** Whether two mark sets are identical in name and attributes. */
function sameMarks(left: readonly Mark[], right: readonly Mark[]): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((mark, index) => right[index]?.eq(mark) ?? false);
}

/** Recursively wrap parts in mark nodes in {@link NESTING_ORDER}. */
function build(parts: readonly InlinePart[], depth: number, out: Content[]): void {
  if (depth === NESTING_ORDER.length) {
    for (const part of parts) {
      out.push(leaf(part));
    }

    return;
  }

  const name = NESTING_ORDER[depth];

  if (!name) {
    return;
  }

  let index = 0;

  while (index < parts.length) {
    const first = parts[index];

    if (!first) {
      break;
    }

    const marked = partHasMark(first, name);
    const run: InlinePart[] = [];

    while (index < parts.length) {
      const part = parts[index];

      if (!part || partHasMark(part, name) !== marked) {
        break;
      }

      run.push(part);
      index += 1;
    }

    if (!marked) {
      build(run, depth + 1, out);
      continue;
    }

    const children: Content[] = [];
    build(run, depth + 1, children);
    out.push(markParent(name, run, children));
  }
}

/** Emit a leaf part. */
function leaf(part: InlinePart): Content {
  switch (part.kind) {
    case "text":
      return { type: "text", value: part.value };
    case "inlineCode":
      return { type: "inlineCode", value: part.value };
    case "node":
      return part.node;
  }
}

/** Build a mark parent for a run of parts. */
function markParent(
  name: (typeof NESTING_ORDER)[number],
  run: readonly InlinePart[],
  children: readonly Content[],
): Content {
  if (name === "link") {
    const mark = findMark(run, "link");
    const href = mark?.attrs.href;
    const title = mark?.attrs.title;

    return {
      type: "link",
      url: typeof href === "string" ? href : "",
      title: typeof title === "string" ? title : null,
      children: children as PhrasingContent[],
    };
  }

  return { type: name, children: children as PhrasingContent[] };
}

/** Find a mark by name among text-like parts. */
function findMark(run: readonly InlinePart[], name: MarkName): Mark | undefined {
  for (const part of run) {
    if (part.kind === "node") {
      continue;
    }

    const mark = part.marks.find((candidate) => candidate.type.name === name);

    if (mark) {
      return mark;
    }
  }

  return undefined;
}

/** Whether a part carries a given mark. */
function partHasMark(part: InlinePart, name: MarkName): boolean {
  if (part.kind === "node") {
    return false;
  }

  return hasMark(part.marks, name);
}

/** Whether a mark set contains a mark name. */
function hasMark(marks: readonly Mark[], name: MarkName): boolean {
  return marks.some((mark) => mark.type.name === name);
}

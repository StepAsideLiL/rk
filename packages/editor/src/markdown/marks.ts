import type { Emphasis, InlineCode, Link, PhrasingContent, Strong } from "mdast";
import type { Mark, Node as PmNode, Schema } from "prosemirror-model";

import type { RootContent as Content } from "mdast";
import type { PmMarkHandler } from "../core/types";

export type MdastMark = Strong | Emphasis | InlineCode | Link;

export const MARK_ORDER = Object.freeze(["link", "strong", "emphasis", "code"] as const);

export type MarkName = (typeof MARK_ORDER)[number];

export function isMdastMark(node: PhrasingContent): node is MdastMark {
  return (
    node.type === "strong" ||
    node.type === "emphasis" ||
    node.type === "inlineCode" ||
    node.type === "link"
  );
}

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

export type UnknownMdastInline = (node: PhrasingContent, marks: readonly Mark[]) => PmNode[] | null;

export interface InlineFromMdastOptions {
  readonly onUnknown?: UnknownMdastInline;

  readonly markFromMdast?: (node: PhrasingContent) => Mark | null;
}

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

      const custom = options.markFromMdast?.(node);

      if (custom) {
        if ("children" in node && Array.isArray(node.children)) {
          visit(node.children as PhrasingContent[], [...marks, custom]);
        } else if ("value" in node && typeof node.value === "string") {
          result.push(schema.text(node.value, [...marks, custom]));
        }

        continue;
      }

      const replaced = options.onUnknown?.(node, marks);
      if (replaced) {
        result.push(...replaced);
      }
    }
  }
}

export type ConvertPmInlineNode = (node: PmNode) => Content[] | null;

export interface InlineToMdastOptions {
  readonly onNode?: ConvertPmInlineNode;

  readonly markToMdast?: Readonly<Record<string, PmMarkHandler>>;
}

type InlinePart =
  | { readonly kind: "text"; readonly value: string; readonly marks: readonly Mark[] }
  | {
      readonly kind: "inlineCode";
      readonly value: string;
      readonly marks: readonly Mark[];
    }
  | { readonly kind: "node"; readonly node: Content };

const NESTING_ORDER = Object.freeze(["link", "strong", "emphasis"] as const);

export function inlineToMdast(
  nodes: readonly PmNode[],
  options: InlineToMdastOptions = {},
): Content[] {
  const parts: InlinePart[] = [];

  for (const node of nodes) {
    if (node.isText) {
      const value = node.text!;

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
  const custom = options.markToMdast ?? {};
  const order = Object.freeze([
    ...NESTING_ORDER,
    ...Object.keys(custom).filter(
      (name) => name !== "code" && !(NESTING_ORDER as readonly string[]).includes(name),
    ),
  ]);

  build(mergeParts(parts), 0, result, order, custom);
  return result;
}

export function withMdastMarks(node: Content, marks: readonly Mark[]): Content {
  if (marks.length === 0 || node.type !== "text") {
    return node;
  }

  const result: Content[] = [];
  build([{ kind: "text", value: node.value, marks }], 0, result, NESTING_ORDER, {});

  return result[0]!;
}

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

function sameMarks(left: readonly Mark[], right: readonly Mark[]): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((mark, index) => right[index]!.eq(mark));
}

function build(
  parts: readonly InlinePart[],
  depth: number,
  out: Content[],
  order: readonly string[],
  serializers: Readonly<Record<string, PmMarkHandler>>,
): void {
  if (depth === order.length) {
    for (const part of parts) {
      out.push(leaf(part));
    }

    return;
  }

  const name = order[depth]!;
  let index = 0;

  while (index < parts.length) {
    const first = parts[index]!;
    const marked = partHasMark(first, name);
    const run: InlinePart[] = [];

    while (index < parts.length) {
      const part = parts[index]!;

      if (partHasMark(part, name) !== marked) {
        break;
      }

      run.push(part);
      index += 1;
    }

    if (!marked) {
      build(run, depth + 1, out, order, serializers);
      continue;
    }

    const children: Content[] = [];
    build(run, depth + 1, children, order, serializers);
    out.push(markParent(name, run, children, serializers));
  }
}

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

function markParent(
  name: string,
  run: readonly InlinePart[],
  children: readonly Content[],
  serializers: Readonly<Record<string, PmMarkHandler>>,
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

  if (name === "strong" || name === "emphasis") {
    return { type: name, children: children as PhrasingContent[] };
  }

  const mark = findMark(run, name);
  const serializer = serializers[name];

  /* v8 ignore next 3 */
  if (!mark || !serializer) {
    throw new Error(`No mdast serializer registered for mark "${name}".`);
  }

  return serializer(mark, children);
}

function findMark(run: readonly InlinePart[], name: string): Mark | undefined {
  for (const part of run) {
    /* v8 ignore next 3 */
    if (part.kind === "node") {
      continue;
    }

    return part.marks.find((candidate) => candidate.type.name === name);
  }

  /* v8 ignore next */
  return undefined;
}

function partHasMark(part: InlinePart, name: string): boolean {
  if (part.kind === "node") {
    return false;
  }

  return hasMark(part.marks, name);
}

function hasMark(marks: readonly Mark[], name: string): boolean {
  return marks.some((mark) => mark.type.name === name);
}

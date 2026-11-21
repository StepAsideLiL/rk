import { history } from "prosemirror-history";
import type { InputRule } from "prosemirror-inputrules";
import { inputRules } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { MarkSpec, NodeSpec } from "prosemirror-model";
import { Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import type { NodeViewConstructor } from "prosemirror-view";
import type { Plugin as UnifiedPlugin } from "unified";

import type {
  Command,
  Extension,
  ExtensionContext,
  MdastHandler,
  MdastMarkHandler,
  PmHandler,
  PmMarkHandler,
} from "./types";

/** Priority used when an extension does not specify one. */
const DEFAULT_PRIORITY = 100;

/**
 * Markdown contributions collected from every extension.
 *
 * The markdown module reads these maps and passes `remarkPlugins` to unified, so
 * core never needs to import the parsing pipeline.
 */
export interface CollectedMarkdown {
  /** Handlers keyed by mdast node type. */
  readonly fromMdast: Readonly<Record<string, MdastHandler>>;

  /** Handlers keyed by ProseMirror node type. */
  readonly toMdast: Readonly<Record<string, PmHandler>>;

  /** Mark parsers keyed by mdast node type. */
  readonly markFromMdast: Readonly<Record<string, MdastMarkHandler>>;

  /** Mark serializers keyed by ProseMirror mark name. */
  readonly markToMdast: Readonly<Record<string, PmMarkHandler>>;

  /** unified/remark plugins merged from every extension. */
  readonly remarkPlugins: readonly UnifiedPlugin[];
}

/**
 * Validated extension set with the contributions they define.
 *
 * The manager owns schema assembly, command collection and plugin ordering. It
 * is created once per editor and stays immutable after construction.
 */
export interface ExtensionManager {
  /** Extensions in stable, ascending priority order. */
  readonly extensions: readonly Extension<unknown>[];

  /** Schema assembled from every extension's nodes and marks. */
  readonly schema: Schema;

  /** Markdown contributions exposed for the markdown module. */
  readonly markdown: CollectedMarkdown;

  /** Node views merged from every extension, keyed by node type. */
  readonly nodeViews: Readonly<Record<string, NodeViewConstructor>>;

  /** Collect commands from every extension, in priority order. */
  createCommands(context: ExtensionContext): Readonly<Record<string, Command>>;

  /** Build the ordered ProseMirror plugin list for an editor. */
  createPlugins(context: ExtensionContext): readonly Plugin[];
}

/**
 * Validate, order and merge a set of extensions.
 *
 * Throws when two extensions share a name, when a `requires` entry is missing
 * or when no `doc` node was contributed.
 */
export function createExtensionManager(
  extensions: readonly Extension<unknown>[],
): ExtensionManager {
  const ordered = orderExtensions(extensions);
  const schema = mergeSchema(ordered);
  const markdown = collectMarkdown(ordered);
  const nodeViews = collectNodeViews(ordered);

  return {
    extensions: ordered,
    schema,
    markdown,
    nodeViews,
    createCommands(context) {
      const commands: Record<string, Command> = {};

      for (const extension of ordered) {
        Object.assign(commands, extension.commands?.(context) ?? {});
      }

      return commands;
    },
    createPlugins(context) {
      return createPlugins(ordered, context);
    },
  };
}

/**
 * Validate names and dependencies, then sort by priority.
 *
 * Sorting is stable: extensions with the same priority keep their declaration
 * order, and a lower value is merged earlier so the first block node wins as the
 * default block.
 */
function orderExtensions(extensions: readonly Extension<unknown>[]): readonly Extension<unknown>[] {
  const names = new Set<string>();

  for (const extension of extensions) {
    if (names.has(extension.name)) {
      throw new Error(
        `Duplicate extension name "${extension.name}". Extension names must be unique.`,
      );
    }

    names.add(extension.name);
  }

  for (const extension of extensions) {
    for (const dependency of extension.requires ?? []) {
      if (!names.has(dependency)) {
        throw new Error(
          `Extension "${extension.name}" requires "${dependency}", which is not installed.`,
        );
      }
    }
  }

  return extensions
    .map((extension, index) => ({ extension, index }))
    .sort(
      (left, right) =>
        priorityOf(left.extension) - priorityOf(right.extension) || left.index - right.index,
    )
    .map(({ extension }) => extension);
}

/** Merge nodes and marks in priority order, then build the schema. */
function mergeSchema(extensions: readonly Extension<unknown>[]): Schema {
  const nodes: Record<string, NodeSpec> = {};
  const marks: Record<string, MarkSpec> = {};

  for (const extension of extensions) {
    Object.assign(nodes, extension.nodes ?? {});
    Object.assign(marks, extension.marks ?? {});
  }

  if (!nodes.doc) {
    throw new Error(
      'Schema is missing a "doc" node. Add a document extension that contributes it.',
    );
  }

  return new Schema({ nodes, marks });
}

/** Merge markdown handlers and remark plugins in priority order. */
function collectMarkdown(extensions: readonly Extension<unknown>[]): CollectedMarkdown {
  const fromMdast: Record<string, MdastHandler> = {};
  const toMdast: Record<string, PmHandler> = {};
  const markFromMdast: Record<string, MdastMarkHandler> = {};
  const markToMdast: Record<string, PmMarkHandler> = {};
  const remarkPlugins: UnifiedPlugin[] = [];

  for (const extension of extensions) {
    const markdown = extension.markdown;

    if (!markdown) {
      continue;
    }

    Object.assign(fromMdast, markdown.fromMdast ?? {});
    Object.assign(toMdast, markdown.toMdast ?? {});
    Object.assign(markFromMdast, markdown.markFromMdast ?? {});
    Object.assign(markToMdast, markdown.markToMdast ?? {});

    if (markdown.remarkPlugins) {
      remarkPlugins.push(...markdown.remarkPlugins);
    }
  }

  return {
    fromMdast,
    toMdast,
    markFromMdast,
    markToMdast,
    remarkPlugins,
  };
}

/** Merge node views in priority order, letting higher priorities win. */
function collectNodeViews(
  extensions: readonly Extension<unknown>[],
): Record<string, NodeViewConstructor> {
  const nodeViews: Record<string, NodeViewConstructor> = {};

  for (const extension of extensions) {
    Object.assign(nodeViews, extension.nodeViews ?? {});
  }

  return nodeViews;
}

/**
 * Build plugins.
 *
 * Keymaps are grouped by priority tier and emitted highest priority first, so
 * the first matching binding (the higher priority one) wins a conflict. Input
 * rules follow the same direction, extension plugins keep schema order and
 * history is always last.
 */
function createPlugins(
  extensions: readonly Extension<unknown>[],
  context: ExtensionContext,
): Plugin[] {
  const plugins: Plugin[] = [];
  const tiers = new Map<number, Extension<unknown>[]>();

  for (const extension of extensions) {
    const priority = priorityOf(extension);
    const tier = tiers.get(priority);

    if (tier) {
      tier.push(extension);
    } else {
      tiers.set(priority, [extension]);
    }
  }

  const priorities = [...tiers.keys()].sort((left, right) => right - left);

  for (const priority of priorities) {
    const bindings: Record<string, Command> = {};

    for (const extension of tiers.get(priority)!) {
      for (const [name, command] of Object.entries(extension.keymap?.(context) ?? {})) {
        if (!(name in bindings)) {
          bindings[name] = command;
        }
      }
    }

    if (Object.keys(bindings).length > 0) {
      plugins.push(keymap(bindings));
    }
  }

  const rules: InputRule[] = [];

  for (const extension of [...extensions].reverse()) {
    rules.push(...(extension.inputRules?.(context) ?? []));
  }

  plugins.push(inputRules({ rules }));

  for (const extension of extensions) {
    plugins.push(...(extension.plugins?.(context) ?? []));
  }

  plugins.push(history());

  return plugins;
}

/** Priority with the default applied. */
function priorityOf(extension: Extension<unknown>): number {
  return extension.priority ?? DEFAULT_PRIORITY;
}

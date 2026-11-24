import { history } from "prosemirror-history";
import type { InputRule } from "prosemirror-inputrules";
import { inputRules } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { MarkSpec, NodeSpec, SchemaSpec } from "prosemirror-model";
import { Schema } from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import type { NodeViewConstructor } from "prosemirror-view";
import type { Plugin as UnifiedPlugin } from "unified";

import { flattenExtensions } from "./flatten-extensions";
import type {
  Command,
  Extension,
  ExtensionContext,
  MdastHandler,
  MdastMarkHandler,
  PmHandler,
  PmMarkHandler,
} from "./types";

const DEFAULT_PRIORITY = 100;

export interface ExtensionManagerOptions {
  readonly schemaSpec?: SchemaSpec;
}

export interface CreatePluginsOptions {
  readonly inputRules?: boolean | readonly (Extension<unknown> | string)[];
}

export interface CollectedMarkdown {
  readonly fromMdast: Readonly<Record<string, MdastHandler>>;

  readonly toMdast: Readonly<Record<string, PmHandler>>;

  readonly markFromMdast: Readonly<Record<string, MdastMarkHandler>>;

  readonly markToMdast: Readonly<Record<string, PmMarkHandler>>;

  readonly remarkPlugins: readonly UnifiedPlugin[];
}

export class ExtensionManager {
  readonly extensions: readonly Extension<unknown>[];

  readonly schema: Schema;

  readonly markdown: CollectedMarkdown;

  readonly nodeViews: Readonly<Record<string, NodeViewConstructor>>;

  constructor(extensions: readonly Extension<unknown>[], options: ExtensionManagerOptions = {}) {
    this.extensions = orderExtensions(flattenExtensions(extensions));
    this.schema = options.schemaSpec
      ? schemaFromSpec(options.schemaSpec, this.extensions)
      : mergeSchema(this.extensions);
    this.markdown = collectMarkdown(this.extensions);
    this.nodeViews = collectNodeViews(this.extensions);
  }

  createCommands(context: ExtensionContext): Readonly<Record<string, Command>> {
    const commands: Record<string, Command> = {};

    for (const extension of this.extensions) {
      Object.assign(commands, extension.commands?.(context) ?? {});
    }

    return commands;
  }

  createPlugins(context: ExtensionContext, options: CreatePluginsOptions = {}): readonly Plugin[] {
    return createPlugins(this.extensions, context, options);
  }
}

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

function collectNodeViews(
  extensions: readonly Extension<unknown>[],
): Record<string, NodeViewConstructor> {
  const nodeViews: Record<string, NodeViewConstructor> = {};

  for (const extension of extensions) {
    Object.assign(nodeViews, extension.nodeViews ?? {});
  }

  return nodeViews;
}

function createPlugins(
  extensions: readonly Extension<unknown>[],
  context: ExtensionContext,
  options: CreatePluginsOptions,
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
    if (inputRulesEnabled(extension, options.inputRules)) {
      rules.push(...(extension.inputRules?.(context) ?? []));
    }
  }

  if (options.inputRules !== false) {
    plugins.push(inputRules({ rules }));
  }

  for (const extension of extensions) {
    plugins.push(...(extension.plugins?.(context) ?? []));
  }

  plugins.push(history());

  return plugins;
}

function priorityOf(extension: Extension<unknown>): number {
  return extension.priority ?? DEFAULT_PRIORITY;
}

function schemaFromSpec(spec: SchemaSpec, extensions: readonly Extension<unknown>[]): Schema {
  const schema = new Schema(spec);
  const extensionNodes = new Set<string>();
  const extensionMarks = new Set<string>();

  for (const extension of extensions) {
    for (const name of Object.keys(extension.nodes ?? {})) {
      extensionNodes.add(name);
    }

    for (const name of Object.keys(extension.marks ?? {})) {
      extensionMarks.add(name);
    }
  }

  for (const name of Object.keys(schema.nodes)) {
    if (!extensionNodes.has(name)) {
      throw new Error(
        `Schema spec node "${name}" has no matching extension node. Every spec node needs an extension.`,
      );
    }
  }

  for (const name of Object.keys(schema.marks)) {
    if (!extensionMarks.has(name)) {
      throw new Error(
        `Schema spec mark "${name}" has no matching extension mark. Every spec mark needs an extension.`,
      );
    }
  }

  for (const name of extensionNodes) {
    if (!schema.nodes[name]) {
      throw new Error(`Extension node "${name}" is missing from the schema spec.`);
    }
  }

  for (const name of extensionMarks) {
    if (!schema.marks[name]) {
      throw new Error(`Extension mark "${name}" is missing from the schema spec.`);
    }
  }

  return schema;
}

function inputRulesEnabled(
  extension: Extension<unknown>,
  filter: CreatePluginsOptions["inputRules"],
): boolean {
  if (filter === undefined || filter === true) {
    return true;
  }

  if (filter === false) {
    return false;
  }

  return filter.some((entry) =>
    typeof entry === "string" ? entry === extension.name : entry === extension,
  );
}

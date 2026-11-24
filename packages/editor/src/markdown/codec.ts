import type { Root } from "mdast";
import type { Schema } from "prosemirror-model";
import type { Node as PmNode } from "prosemirror-model";
import remarkParse from "remark-parse";
import type { Options as RemarkStringifyOptions } from "remark-stringify";
import remarkStringify from "remark-stringify";
import { unified, type Plugin as UnifiedPlugin } from "unified";

import { ExtensionManager } from "../core/extension-manager";
import type { ContentCodec, Extension } from "../core/types";
import { fromMdastRoot, toMdastRoot } from "./convert";
import type { UnknownNodeStrategy } from "./types";

/**
 * Unknown-node strategy used when none is configured.
 *
 * Development is strict so missing handlers are caught in tests; production
 * keeps unknown content instead of throwing in front of users.
 */
const DEFAULT_UNKNOWN: UnknownNodeStrategy = defaultUnknownNodeStrategy(import.meta.env.DEV);

/** Default strategy for a development or production build. */
export function defaultUnknownNodeStrategy(development: boolean): UnknownNodeStrategy {
  return development ? "throw" : "preserve";
}

/**
 * Formatting defaults chosen to be stable and canonical.
 *
 * `*` for emphasis/strong and `-` for bullets match the normalization contract,
 * and callers can override any of them through {@link MarkdownCodecOptions.stringify}.
 */
const STRINGIFY_DEFAULTS = Object.freeze({
  emphasis: "*",
  strong: "*",
  bullet: "-",
} as const satisfies Readonly<RemarkStringifyOptions>);

/** Options shared by the markdown codec. */
export interface MarkdownCodecConfig {
  /** What to do with nodes that have no registered handler. */
  readonly unknownNode?: UnknownNodeStrategy;

  /** Options forwarded to remark-stringify. */
  readonly stringify?: Readonly<RemarkStringifyOptions>;
}

/** Options accepted by {@link MarkdownCodec}. */
export interface MarkdownCodecOptions extends MarkdownCodecConfig {
  /** Extensions whose schema and markdown handlers drive the codec. */
  readonly extensions: readonly Extension<unknown>[];
}

/**
 * Markdown codec built once per editor.
 *
 * Parsing and stringifying processors are created in the constructor and reused
 * for every call, including the remark plugins contributed by extensions.
 */
export class MarkdownCodec implements ContentCodec {
  private readonly manager: ExtensionManager;
  private readonly strategy: UnknownNodeStrategy;
  private readonly parseProcessor: ReturnType<typeof createParseProcessor>;
  private readonly stringifyProcessor: ReturnType<typeof createStringifyProcessor>;

  constructor(options: MarkdownCodecOptions) {
    this.manager = new ExtensionManager(options.extensions);
    this.strategy = options.unknownNode ?? DEFAULT_UNKNOWN;
    this.parseProcessor = createParseProcessor(this.manager.markdown.remarkPlugins);
    this.stringifyProcessor = createStringifyProcessor(
      this.manager.markdown.remarkPlugins,
      options.stringify,
    );
  }

  parse(markdown: string, schema: Schema): PmNode {
    const tree = this.parseProcessor.parse(markdown) as Root;
    const transformed = this.parseProcessor.runSync(tree) as Root;

    return fromMdastRoot(transformed, schema, this.manager.markdown, this.strategy);
  }

  serialize(doc: PmNode): string {
    const root = toMdastRoot(doc, this.manager.markdown, this.strategy);
    const transformed = this.stringifyProcessor.runSync(root) as Root;

    return this.stringifyProcessor.stringify(transformed).replace(/\n$/, "");
  }
}

/** Create the remark parse processor, including extension plugins. */
function createParseProcessor(remarkPlugins: readonly UnifiedPlugin[]) {
  const processor = unified().use(remarkParse);

  for (const plugin of remarkPlugins) {
    processor.use(plugin);
  }

  return processor;
}

/** Create the remark stringify processor, including extension plugins. */
function createStringifyProcessor(
  remarkPlugins: readonly UnifiedPlugin[],
  options: Readonly<RemarkStringifyOptions> | undefined,
) {
  const processor = unified().use(remarkStringify, {
    ...STRINGIFY_DEFAULTS,
    ...options,
  });

  for (const plugin of remarkPlugins) {
    processor.use(plugin);
  }

  return processor;
}
